import { NextResponse } from "next/server";
import { agentGet } from "@/lib/agentProxy";
import { buildActivityEvents } from "@/lib/activityLogic";
import {
  insertActivityEvents,
  listActivityEvents,
  readCurrentDeviceState,
  replaceDeviceState,
  type DbActivityEvent,
  type DbDeviceSnapshot,
} from "@/lib/server/db";
import { scanDevicesFallback } from "@/lib/server/scanFallback";

type AgentDevice = {
  ip: string;
  mac: string;
  online: boolean;
  latencyMs: number | null;
  name?: string;
  vendor?: string;
  openPorts?: number[];
};

let lastAgentUnreachableLogMs = 0;

function logAgentFailure(message: string) {
  const isUnreachable = /Local Agent is unreachable|fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(message);
  if (!isUnreachable) {
    console.error("[activity/snapshot] agent failed:", message);
    return;
  }

  const now = Date.now();
  if (now - lastAgentUnreachableLogMs > 60_000) {
    console.warn("[activity/snapshot] agent unreachable, using fallback scanner.");
    lastAgentUnreachableLogMs = now;
  }
}

function suspiciousPortEvent(device: AgentDevice, timestamp: string): DbActivityEvent | null {
  const ports = device.openPorts ?? [];
  const suspicious = ports.find((port) => [22, 23, 3389, 445].includes(port));
  if (!suspicious) return null;

  return {
    id: `${timestamp}-${device.ip}-${device.mac}-suspicious-port-${suspicious}`,
    type: "security_alert",
    deviceIp: device.ip,
    deviceMac: device.mac,
    deviceLabel: device.name || device.ip,
    details: `U zbulua portë e hapur e dyshimtë: ${suspicious}`,
    severity: "critical",
    timestamp,
  };
}

function unknownVendorEvent(device: AgentDevice, timestamp: string): DbActivityEvent | null {
  const vendor = (device.vendor || "").trim().toLowerCase();
  const isUnknown = !vendor || vendor === "unknown" || vendor === "n/a";
  if (!isUnknown) return null;

  return {
    id: `${timestamp}-${device.ip}-${device.mac}-unknown-vendor`,
    type: "security_alert",
    deviceIp: device.ip,
    deviceMac: device.mac,
    deviceLabel: device.name || device.ip,
    details: "U zbulua pajisje me prodhues të panjohur në rrjetin lokal.",
    severity: "warn",
    timestamp,
  };
}

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    let devices: AgentDevice[];
    try {
      const payload = await agentGet<{ devices: AgentDevice[] }>("/scan/devices");
      devices = payload.devices;
    } catch (agentError) {
      const message = agentError instanceof Error ? agentError.message : "Agent scan failed.";
      logAgentFailure(message);
      devices = await scanDevicesFallback();
    }

    const currentDevices: DbDeviceSnapshot[] = devices.map((device) => ({
      ip: device.ip,
      mac: device.mac,
      online: device.online,
      latencyMs: device.latencyMs,
      name: device.ip,
      vendor: device.vendor,
      riskLevel: device.openPorts?.some((p) => [22, 23, 3389, 445].includes(p)) ? "high" : "low",
    }));

    const previous = readCurrentDeviceState();
    const diffEvents = buildActivityEvents(previous, currentDevices, timestamp);
    const prevKeys = new Set(previous.map((item) => `${item.ip}-${item.mac}`.toUpperCase()));
    const suspiciousEvents = devices.flatMap((device) => {
      const currentKey = `${device.ip}-${device.mac}`.toUpperCase();
      const isNewDevice = !prevKeys.has(currentKey);
      const events: DbActivityEvent[] = [];

      const portEvent = suspiciousPortEvent(device, timestamp);
      if (portEvent) {
        events.push(portEvent);
      }

      if (isNewDevice) {
        const vendorEvent = unknownVendorEvent(device, timestamp);
        if (vendorEvent) {
          events.push(vendorEvent);
        }
      }

      return events;
    });

    replaceDeviceState(currentDevices, timestamp);
    insertActivityEvents([...diffEvents, ...suspiciousEvents]);

    return NextResponse.json(
      {
        scannedDevices: devices.map((device) => ({
          ip: device.ip,
          mac: device.mac,
          online: device.online,
          latencyMs: device.latencyMs,
          name: device.name || device.ip,
        })),
        events: listActivityEvents(120),
        timestamp,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to capture activity snapshot.";
    console.error("[activity/snapshot]", message);
    return NextResponse.json(
      { error: message },
      { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
