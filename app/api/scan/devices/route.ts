import { NextResponse } from "next/server";
import { agentGet } from "@/lib/agentProxy";
import { resolveDeviceName } from "@/lib/server/deviceNames";
import { scanDevicesFallback } from "@/lib/server/scanFallback";

type AgentDevice = {
  ip: string;
  mac: string;
  online: boolean;
  latencyMs: number | null;
  name?: string;
  nameSource?: "reverse_dns" | "netbios" | "dhcp_lookup";
  nameConfidence?: "high" | "medium" | "low";
  vendor: string;
  osGuess: string;
  openPorts: number[];
  openPortsSummary: string;
};

let lastAgentUnreachableLogMs = 0;

function logAgentFailure(message: string) {
  const isUnreachable = /Local Agent is unreachable|fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(message);
  if (!isUnreachable) {
    console.error("[scan/devices] agent failed:", message);
    return;
  }

  const now = Date.now();
  if (now - lastAgentUnreachableLogMs > 60_000) {
    console.warn("[scan/devices] agent unreachable, using fallback scanner.");
    lastAgentUnreachableLogMs = now;
  }
}

export async function GET() {
  try {
    const payload = await agentGet<{ timestamp: string; devices: AgentDevice[] }>("/scan/devices");
    const devices = await Promise.all(
      payload.devices.map(async (device) => {
        if (device.name?.trim()) return device;
        const resolved = await resolveDeviceName(device.ip);
        return {
          ...device,
          name: resolved.name,
          nameSource: resolved.source,
          nameConfidence: resolved.confidence,
        };
      }),
    );
    return NextResponse.json(devices, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to scan devices.";
    logAgentFailure(message);
    try {
      const fallback = await scanDevicesFallback();
      return NextResponse.json(fallback, {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-NetPulse-Data-Source": "fallback",
        },
      });
    } catch (fallbackError) {
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "Fallback scan failed.";
      console.error("[scan/devices] fallback failed:", fallbackMessage);
      return NextResponse.json({ error: fallbackMessage }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
    }
  }
}
