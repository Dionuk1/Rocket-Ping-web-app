import "server-only";

import { reverse } from "node:dns/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CACHE_TTL_MS = 2 * 60_000;

export type NameSource = "reverse_dns" | "netbios" | "dhcp_lookup";
export type NameConfidence = "high" | "medium" | "low";

export type DeviceNameInfo = {
  name?: string;
  source?: NameSource;
  confidence?: NameConfidence;
};

type CacheEntry = DeviceNameInfo & {
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function fromCache(ip: string): DeviceNameInfo | null {
  const existing = cache.get(ip);
  if (!existing) return null;
  if (Date.now() > existing.expiresAt) {
    cache.delete(ip);
    return null;
  }
  return {
    name: existing.name,
    source: existing.source,
    confidence: existing.confidence,
  };
}

function saveCache(ip: string, info: DeviceNameInfo): DeviceNameInfo {
  cache.set(ip, {
    ...info,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return info;
}

function isUsableName(name: string): boolean {
  const n = name.trim();
  if (!n) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(n)) return false;
  if (n.toLowerCase() === "unknown") return false;
  return true;
}

async function resolveByReverseDns(ip: string): Promise<DeviceNameInfo | null> {
  try {
    const names = await reverse(ip);
    const first = names[0]?.trim();
    if (first && isUsableName(first)) {
      return { name: first, source: "reverse_dns", confidence: "high" };
    }
  } catch {
    // best effort
  }
  return null;
}

async function resolveByNetbios(ip: string): Promise<DeviceNameInfo | null> {
  if (process.platform !== "win32") return null;
  try {
    const { stdout } = await execFileAsync("nbtstat", ["-A", ip], {
      timeout: 3500,
      windowsHide: true,
      maxBuffer: 512 * 1024,
    });
    const lines = (stdout || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      if (!/<00>\s+UNIQUE/i.test(line)) continue;
      const candidate = line.split(/\s+/)[0];
      if (candidate && isUsableName(candidate)) {
        return { name: candidate, source: "netbios", confidence: "medium" };
      }
    }
  } catch {
    // best effort
  }
  return null;
}

async function resolveByHostLookup(ip: string): Promise<DeviceNameInfo | null> {
  if (process.platform !== "win32") return null;
  try {
    const { stdout } = await execFileAsync("ping", ["-a", "-n", "1", "-w", "900", ip], {
      timeout: 3000,
      windowsHide: true,
      maxBuffer: 512 * 1024,
    });
    const line = (stdout || "").split(/\r?\n/).find((l) => /Pinging\s+/i.test(l));
    if (!line) return null;
    const match = line.match(/Pinging\s+(.+?)\s+\[/i);
    const candidate = match?.[1]?.trim();
    if (candidate && isUsableName(candidate)) {
      return { name: candidate, source: "dhcp_lookup", confidence: "low" };
    }
  } catch {
    // best effort
  }
  return null;
}

export async function resolveDeviceName(ip: string): Promise<DeviceNameInfo> {
  const cached = fromCache(ip);
  if (cached) return cached;

  const fromDns = await resolveByReverseDns(ip);
  if (fromDns) return saveCache(ip, fromDns);

  const fromNetbios = await resolveByNetbios(ip);
  if (fromNetbios) return saveCache(ip, fromNetbios);

  const fromLookup = await resolveByHostLookup(ip);
  if (fromLookup) return saveCache(ip, fromLookup);

  return saveCache(ip, {});
}
