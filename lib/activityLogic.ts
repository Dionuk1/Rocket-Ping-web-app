import type { DbActivityEvent, DbDeviceSnapshot } from "@/lib/server/db";

const LATENCY_SPIKE_MS = 80;

function key(device: Pick<DbDeviceSnapshot, "ip" | "mac">): string {
  return `${device.ip}-${device.mac}`.toUpperCase();
}

function label(device: DbDeviceSnapshot): string {
  return device.name || device.ip;
}

export function buildActivityEvents(previous: DbDeviceSnapshot[], current: DbDeviceSnapshot[], timestamp: string): DbActivityEvent[] {
  const prevMap = new Map(previous.map((device) => [key(device), device]));
  const nextMap = new Map(current.map((device) => [key(device), device]));
  const events: DbActivityEvent[] = [];

  for (const [deviceKey, next] of nextMap) {
    const prev = prevMap.get(deviceKey);
    if (!prev) {
      events.push({
        id: `${timestamp}-${deviceKey}-device_added`,
        timestamp,
        type: "device_added",
        deviceIp: next.ip,
        deviceMac: next.mac,
        deviceLabel: label(next),
        details: `Pajisje e re u lidh në rrjet me IP ${next.ip}.`,
        severity: "warn",
      });
      continue;
    }

    if (!prev.online && next.online) {
      events.push({
        id: `${timestamp}-${deviceKey}-came_online`,
        timestamp,
        type: "came_online",
        deviceIp: next.ip,
        deviceMac: next.mac,
        deviceLabel: label(next),
        details: "Po përgjigjet sërish ndaj ping.",
        severity: "info",
      });
    }

    if (prev.online && !next.online) {
      events.push({
        id: `${timestamp}-${deviceKey}-went_offline`,
        timestamp,
        type: "went_offline",
        deviceIp: next.ip,
        deviceMac: next.mac,
        deviceLabel: label(next),
        details: "Ndaloi së përgjigjuri ndaj ping.",
        severity: "warn",
      });
    }

    if (
      prev.online &&
      next.online &&
      prev.latencyMs != null &&
      next.latencyMs != null &&
      next.latencyMs - prev.latencyMs >= LATENCY_SPIKE_MS
    ) {
      events.push({
        id: `${timestamp}-${deviceKey}-latency_spike`,
        timestamp,
        type: "latency_spike",
        deviceIp: next.ip,
        deviceMac: next.mac,
        deviceLabel: label(next),
        details: `Vonesa u rrit nga ${prev.latencyMs}ms në ${next.latencyMs}ms`,
        severity: "critical",
      });
    }
  }

  for (const [deviceKey, prev] of prevMap) {
    if (!nextMap.has(deviceKey)) {
      events.push({
        id: `${timestamp}-${deviceKey}-device_removed`,
        timestamp,
        type: "device_removed",
        deviceIp: prev.ip,
        deviceMac: prev.mac,
        deviceLabel: label(prev),
        details: `Nuk është më e dukshme në tabelën ARP (${prev.ip})`,
        severity: "warn",
      });
    }
  }

  return events;
}
