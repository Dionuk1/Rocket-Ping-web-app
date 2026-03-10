import type { ActivitySnapshotResponse } from "@/lib/api";

type ActivityEvent = NonNullable<ActivitySnapshotResponse["events"]>[number];

const legacyAlbanianCharacterMap = new Map<string, string>([
  ["Ã«", "ë"],
  ["Ã‡", "Ç"],
  ["Ã§", "ç"],
  ["Ã‹", "Ë"],
  ["Ã–", "Ö"],
  ["Ã¶", "ö"],
]);

function normalizeLegacyAlbanianText(text: string): string {
  let normalized = text;

  for (const [broken, fixed] of legacyAlbanianCharacterMap) {
    normalized = normalized.replaceAll(broken, fixed);
  }

  return normalized;
}

export function getActivityEventLabel(type: ActivityEvent["type"], isSq: boolean): string {
  if (type === "device_added") return isSq ? "Pajisje e shtuar" : "Device added";
  if (type === "device_removed") return isSq ? "Pajisje e hequr" : "Device removed";
  if (type === "came_online") return isSq ? "U lidh" : "Came online";
  if (type === "went_offline") return isSq ? "Doli jashtë linje" : "Went offline";
  if (type === "security_alert") return isSq ? "Alarm sigurie" : "Security alert";
  return isSq ? "Rritje e vonesës" : "Latency spike";
}

export function translateActivityDetails(details: string, isSq: boolean): string {
  const text = normalizeLegacyAlbanianText(details);

  const newDeviceMatch = text.match(/^Pajisje e re u lidh në rrjet me IP ([\d.]+)\.$/);
  if (newDeviceMatch) {
    return isSq ? text : `New device joined the network with IP ${newDeviceMatch[1]}.`;
  }

  if (text === "Po përgjigjet sërish ndaj ping.") {
    return isSq ? text : "Responded to ping again.";
  }

  if (text === "Ndaloi së përgjigjuri ndaj ping.") {
    return isSq ? text : "Stopped responding to ping.";
  }

  const latencyMatch = text.match(/^Vonesa u rrit nga (\d+)ms në (\d+)ms$/);
  if (latencyMatch) {
    return isSq ? text : `Latency rose from ${latencyMatch[1]}ms to ${latencyMatch[2]}ms`;
  }

  const arpMatch = text.match(/^Nuk është më e dukshme në tabelën ARP \(([\d.]+)\)$/);
  if (arpMatch) {
    return isSq ? text : `No longer visible in the ARP table (${arpMatch[1]})`;
  }

  const suspiciousPortMatch = text.match(/^U zbulua portë e hapur e dyshimtë: (\d+)$/);
  if (suspiciousPortMatch) {
    return isSq ? text : `Suspicious open port detected: ${suspiciousPortMatch[1]}`;
  }

  if (text === "U zbulua pajisje me prodhues të panjohur në rrjetin lokal.") {
    return isSq ? text : "Unknown vendor device detected on the local network.";
  }

  return text;
}