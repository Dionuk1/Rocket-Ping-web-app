import net from "node:net";
import os from "node:os";
import { PING_TIMEOUT_MS, SCAN_PING_CONCURRENCY } from "./config.js";
import { isIPv4Address, isLocalIPv4, mapWithLimit, runCommand } from "./utils.js";
import { lookupVendorByMac } from "./oui.js";

export type NetworkInfo = {
  ssid: string;
  localIp: string;
  gateway: string;
  dns: string[];
};

export type PortScanItem = {
  port: number;
  service: string;
  open: boolean;
};

export type DeviceScanItem = {
  ip: string;
  mac: string;
  online: boolean;
  latencyMs: number | null;
  vendor: string;
  osGuess: string;
  openPorts: number[];
  openPortsSummary: string;
};

const COMMON_PORTS: Array<{ port: number; service: string }> = [
  { port: 22, service: "ssh" },
  { port: 53, service: "dns" },
  { port: 80, service: "http" },
  { port: 135, service: "rpc" },
  { port: 139, service: "netbios-ssn" },
  { port: 443, service: "https" },
  { port: 445, service: "microsoft-ds" },
  { port: 3389, service: "rdp" },
];

const DISCOVERY_SWEEP_INTERVAL_MS = 5 * 60_000;
const DISCOVERY_PING_CONCURRENCY = 12;
const DISCOVERY_PING_TIMEOUT_MS = 900;
const subnetSweepAt = new Map<string, number>();

function ensureWindows(): void {
  if (process.platform !== "win32") {
    throw new Error("Agent endpoints are Windows-only.");
  }
}

function parseSsid(output: string): string {
  for (const raw of output.split(/\r?\n/)) {
    const m = raw.match(/^\s*SSID\s*:\s*(.+)\s*$/i);
    if (m && !/BSSID/i.test(raw)) {
      const val = m[1].trim();
      if (val && val.toLowerCase() !== "n/a") return val;
    }
  }
  return "Wired (Ethernet)";
}

function normalizeMac(mac: string): string {
  return mac.replace(/-/g, ":").toUpperCase();
}

function isLikelyVirtualInterface(name: string): boolean {
  return /(loopback|vethernet|virtual|vmware|vbox|hyper-v|docker|wsl|tailscale|zerotier|hamachi|npcap)/i.test(name);
}

function parseArpEntries(output: string): Array<{ ip: string; mac: string }> {
  const results: Array<{ ip: string; mac: string }> = [];
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/\s*(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-]{17})\s+\w+/);
    if (!match) continue;

    const ip = match[1];
    const mac = normalizeMac(match[2]);

    if (!isLocalIPv4(ip)) continue;
    if (mac === "FF:FF:FF:FF:FF:FF") continue;
    results.push({ ip, mac });
  }

  const seen = new Set<string>();
  return results.filter((entry) => {
    const key = `${entry.ip}-${entry.mac}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parsePing(output: string): { online: boolean; latencyMs: number | null; ttl: number | null } {
  const online = /TTL=/i.test(output) || /Reply from/i.test(output);
  if (!online) return { online: false, latencyMs: null, ttl: null };

  const exact = output.match(/time[=<]\s*(\d+)ms/i);
  const avg = output.match(/Average\s*=\s*(\d+)ms/i);
  const ttlMatch = output.match(/TTL=(\d+)/i);

  return {
    online: true,
    latencyMs: exact ? Number(exact[1]) : avg ? Number(avg[1]) : null,
    ttl: ttlMatch ? Number(ttlMatch[1]) : null,
  };
}

function guessOsFromTtl(ttl: number | null): string {
  if (ttl == null) return "Unknown";
  if (ttl <= 64) return "Linux/Unix-like";
  if (ttl <= 128) return "Windows";
  return "Network Device/Other";
}

function parsePortRange(raw: string | null): number[] | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{1,5})-(\d{1,5})$/);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  if (start < 1 || end > 65535 || start > end) return null;
  if (end - start > 64) return null;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function scanPort(ip: string, port: number, timeoutMs = 700): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (open: boolean) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));

    socket.connect(port, ip);
  });
}

function getLocalIpFromOs(): string {
  const interfaces = os.networkInterfaces();
  for (const [interfaceName, entries] of Object.entries(interfaces)) {
    if (!entries) continue;
    if (isLikelyVirtualInterface(interfaceName)) continue;
    for (const entry of entries) {
      if (entry.family !== "IPv4") continue;
      if (entry.internal) continue;
      if (!isIPv4Address(entry.address)) continue;
      if (!isLocalIPv4(entry.address)) continue;
      if (entry.address.startsWith("127.")) continue;
      return entry.address;
    }
  }
  return "";
}

function getLocalPrivateIpsFromOs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips = new Set<string>();
  for (const [interfaceName, entries] of Object.entries(interfaces)) {
    if (!entries) continue;
    if (isLikelyVirtualInterface(interfaceName)) continue;
    for (const entry of entries) {
      if (entry.family !== "IPv4") continue;
      if (entry.internal) continue;
      if (!isLocalIPv4(entry.address)) continue;
      ips.add(entry.address);
    }
  }
  return [...ips];
}

async function getGatewayFromRoute(): Promise<string> {
  const route = await runCommand("route", ["PRINT", "-4"], 5000);
  if (!route.ok) return "";
  const match = route.output.match(/^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)/m);
  if (!match) return "";
  return isIPv4Address(match[1]) ? match[1] : "";
}

function subnetPrefix(ip: string): string {
  const parts = ip.split(".");
  if (parts.length !== 4) return "";
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

function buildDiscoveryTargets(localIp: string, gateway: string, knownIps: Set<string>): string[] {
  const prefix = subnetPrefix(localIp);
  if (!prefix) return [];
  const targets: string[] = [];
  for (let host = 1; host <= 254; host += 1) {
    const ip = `${prefix}.${host}`;
    if (ip === localIp || ip === gateway) continue;
    if (knownIps.has(ip)) continue;
    targets.push(ip);
  }
  return targets;
}

async function warmArpDiscovery(localIp: string, gateway: string, knownIps: Set<string>): Promise<void> {
  const prefix = subnetPrefix(localIp);
  if (!prefix) return;

  const now = Date.now();
  const last = subnetSweepAt.get(prefix) ?? 0;
  if (now - last < DISCOVERY_SWEEP_INTERVAL_MS) return;
  subnetSweepAt.set(prefix, now);

  const targets = buildDiscoveryTargets(localIp, gateway, knownIps);
  if (targets.length === 0) return;

  await mapWithLimit(targets, DISCOVERY_PING_CONCURRENCY, async (target) => {
    await runCommand("ping", ["-n", "1", "-w", "250", target], DISCOVERY_PING_TIMEOUT_MS);
    return 0;
  });
}

export async function getNetworkInfo(): Promise<NetworkInfo> {
  ensureWindows();

  const ssidRaw = await runCommand("netsh", ["wlan", "show", "interfaces"], 7000);
  const ssid = parseSsid(ssidRaw.output);

  const psScript = `
$cfg = Get-NetIPConfiguration |
  Where-Object {
    $_.NetAdapter.Status -eq 'Up' -and
    $_.IPv4Address -ne $null -and
    $_.NetAdapter.InterfaceDescription -notmatch 'Hyper-V|VMware|VirtualBox|TAP|Tailscale|ZeroTier|Loopback|Npcap|Docker|WSL'
  } |
  Sort-Object @{Expression={ if ($_.IPv4DefaultGateway -ne $null) { 0 } else { 1 } }}, InterfaceMetric |
  Select-Object -First 1;
if ($null -eq $cfg) {
  [pscustomobject]@{ localIp = ""; gateway = ""; dns = @() } | ConvertTo-Json -Compress
  exit 0
}
$ip = $cfg.IPv4Address.IPAddress | Select-Object -First 1;
$gw = "";
if ($cfg.IPv4DefaultGateway -ne $null) { $gw = $cfg.IPv4DefaultGateway.NextHop; }
$dns = @();
try { $dns = (Get-DnsClientServerAddress -InterfaceIndex $cfg.InterfaceIndex -AddressFamily IPv4).ServerAddresses } catch { }
[pscustomobject]@{ localIp = $ip; gateway = $gw; dns = $dns } | ConvertTo-Json -Compress
`.trim();

  const configRaw = await runCommand("powershell.exe", ["-NoProfile", "-Command", psScript], 7000);
  let parsed: { localIp?: string; gateway?: string; dns?: string[] } = {};
  if (configRaw.ok) {
    try {
      parsed = JSON.parse(configRaw.output || "{}") as { localIp?: string; gateway?: string; dns?: string[] };
    } catch {
      parsed = {};
    }
  }

  const localIpFromPs = (parsed.localIp || "").trim();
  const gatewayFromPs = (parsed.gateway || "").trim();
  const dns = Array.isArray(parsed.dns) ? parsed.dns.filter(isIPv4Address) : [];

  const localIp = isIPv4Address(localIpFromPs) ? localIpFromPs : getLocalIpFromOs();
  const gateway = isIPv4Address(gatewayFromPs) ? gatewayFromPs : await getGatewayFromRoute();

  return { ssid, localIp, gateway, dns };
}

export async function pingHost(host: string): Promise<{ host: string; online: boolean; latencyMs: number | null; ttl: number | null; output: string }> {
  ensureWindows();
  if (!isIPv4Address(host)) {
    throw new Error("Host must be a valid IPv4 address.");
  }
  const result = await runCommand("ping", ["-n", "1", "-w", "900", host], PING_TIMEOUT_MS);
  const parsed = parsePing(result.output);
  return {
    host,
    online: parsed.online,
    latencyMs: parsed.latencyMs,
    ttl: parsed.ttl,
    output: result.output,
  };
}

export async function scanPorts(ip: string, range: string | null): Promise<{ ip: string; ports: PortScanItem[]; openPorts: number[]; summary: string }> {
  ensureWindows();
  if (!isIPv4Address(ip)) throw new Error("Invalid IPv4 address.");

  const rangePorts = parsePortRange(range);
  const targets = rangePorts
    ? rangePorts.map((port) => ({ port, service: "custom" }))
    : COMMON_PORTS;

  const ports = await mapWithLimit(targets, 24, async (target) => {
    const open = await scanPort(ip, target.port);
    return {
      port: target.port,
      service: target.service,
      open,
    };
  });

  const openPorts = ports.filter((p) => p.open).map((p) => p.port);
  const summary = openPorts.length === 0 ? "No common ports open." : `Open: ${openPorts.join(", ")}`;
  return { ip, ports, openPorts, summary };
}

export async function scanOs(ip: string): Promise<{ ip: string; osGuess: string; ttl: number | null }> {
  const ping = await pingHost(ip);
  return {
    ip,
    ttl: ping.ttl,
    osGuess: guessOsFromTtl(ping.ttl),
  };
}

export function scanVendor(mac: string): { mac: string; vendor: string } {
  return {
    mac,
    vendor: lookupVendorByMac(mac),
  };
}

export async function scanDevices(): Promise<DeviceScanItem[]> {
  ensureWindows();
  let arp = await runCommand("arp", ["-a"], 7000);
  if (!arp.ok) throw new Error(arp.output || "arp -a failed.");

  let entries = parseArpEntries(arp.output);
  try {
    const info = await getNetworkInfo();
    const knownIps = new Set(entries.map((entry) => entry.ip));
    const localIps = getLocalPrivateIpsFromOs();
    for (const localIp of localIps) {
      const sameSubnetGateway = subnetPrefix(localIp) === subnetPrefix(info.gateway) ? info.gateway : "";
      await warmArpDiscovery(localIp, sameSubnetGateway, knownIps);
    }
    arp = await runCommand("arp", ["-a"], 7000);
    if (arp.ok) {
      entries = parseArpEntries(arp.output);
    }
  } catch {
    // keep ARP-only results on discovery failure
  }

  const results = await mapWithLimit(entries, SCAN_PING_CONCURRENCY, async (entry) => {
    const ping = await pingHost(entry.ip).catch(() => ({ online: false, latencyMs: null, ttl: null }));
    const osGuess = guessOsFromTtl(ping.ttl);
    let openPorts: number[] = [];
    let summary = "Host offline";
    if (ping.online) {
      const ports = await scanPorts(entry.ip, null).catch(() => ({ openPorts: [], summary: "Port scan unavailable" }));
      openPorts = ports.openPorts;
      summary = ports.summary;
    }

    return {
      ip: entry.ip,
      mac: entry.mac,
      online: ping.online,
      latencyMs: ping.latencyMs,
      vendor: lookupVendorByMac(entry.mac),
      osGuess,
      openPorts,
      openPortsSummary: summary,
    };
  });

  results.sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
  return results;
}
