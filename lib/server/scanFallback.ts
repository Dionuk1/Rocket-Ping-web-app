import "server-only";

import { resolveDeviceName } from "@/lib/server/deviceNames";
import { scanArpDevices } from "@/lib/windowsNetwork";

export type FallbackDevice = {
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

export async function scanDevicesFallback(): Promise<FallbackDevice[]> {
  const devices = await scanArpDevices();

  return Promise.all(
    devices.map(async (device) => {
      const resolved = await resolveDeviceName(device.ip);
      return {
        ip: device.ip,
        mac: device.mac,
        online: device.online,
        latencyMs: device.latencyMs,
        name: resolved.name,
        nameSource: resolved.source,
        nameConfidence: resolved.confidence,
        vendor: "Unknown",
        osGuess: "Unknown",
        openPorts: [],
        openPortsSummary: "N/A",
      };
    }),
  );
}
