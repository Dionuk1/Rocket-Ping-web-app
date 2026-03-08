export type NetworkInfoResponse = {
  ssid: string;
  localIp: string;
  gateway: string;
  dnsServers: string[];
};

export type ScannedDeviceResponse = {
  ip: string;
  mac: string;
  online: boolean;
  latencyMs: number | null;
  name?: string;
  nameSource?: "reverse_dns" | "netbios" | "dhcp_lookup";
  nameConfidence?: "high" | "medium" | "low";
  vendor?: string;
  osGuess?: string;
  openPortsSummary?: string;
  openPorts?: number[];
  riskLevel?: "low" | "medium" | "high";
  riskReason?: string;
};

export type PingResponse = {
  ip: string;
  online: boolean;
  latencyMs: number | null;
};

export type ActivityDevice = {
  ip: string;
  mac: string;
  online: boolean;
  latencyMs: number | null;
  name?: string;
};

export type ActivitySnapshotResponse = {
  scannedDevices: ActivityDevice[];
  events?: Array<{
    id: string;
    type: "device_added" | "device_removed" | "went_offline" | "came_online" | "latency_spike" | "security_alert";
    deviceLabel: string;
    details: string;
    severity: "info" | "warn" | "critical";
    timestamp: string;
  }>;
  timestamp: string;
};

export type TrustLiveResponse = {
  score: number;
  badge: string;
  encryption: number;
  stability: number;
  dnsConsistency: number;
  routerBehavior: number;
  recommendation: string;
  timestamp: string;
};

export type AdvancedReportResponse = {
  generatedAt: string;
  network: NetworkInfoResponse;
  devices: ScannedDeviceResponse[];
  speedHistory: SpeedHistoryApiItem[];
  activityEvents: Array<{
    id: string;
    type: "device_added" | "device_removed" | "went_offline" | "came_online" | "latency_spike" | "security_alert";
    deviceLabel: string;
    details: string;
    severity: "info" | "warn" | "critical";
    timestamp: string;
  }>;
  trustLatest: {
    timestamp: string;
    score: number;
    badge: string;
    encryption: number;
    stability: number;
    dnsConsistency: number;
    routerBehavior: number;
  } | null;
};

export type SpeedHistoryApiItem = {
  id: string;
  timestamp: string;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  targetHost: string;
};

export type LiveBandwidthResponse = {
  rxMbps: number;
  txMbps: number;
  interfaceAlias: string;
  timestamp: string;
};

export type OoklaSpeedTestResponse = {
  timestamp: string;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  packetLoss: number;
  isp: string;
  publicIp: string;
  serverName: string;
  serverLocation: string;
  resultUrl: string | null;
};

export type PortScanResponse = {
  ip: string;
  ports: Array<{ port: number; service: string; open: boolean }>;
  openPorts: number[];
  summary: string;
};

export type OsGuessResponse = {
  ip: string;
  osGuess: string;
  ttl: number | null;
};

export type VendorResponse = {
  mac: string;
  vendor: string;
};

export type TerminalCommand = "ping" | "tracert" | "nslookup" | "ipconfig" | "arp" | "netstat";

export type TerminalRunResponse = {
  ok: boolean;
  output: string;
};

type ApiError = {
  error?: string;
};

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  let payload: (T & ApiError) | null = null;
  if (contentType.includes("application/json")) {
    payload = (await response.json()) as T & ApiError;
  } else {
    const text = await response.text();
    throw new Error(text ? `Unexpected non-JSON response from ${url}: ${text.slice(0, 120)}` : `Unexpected non-JSON response from ${url}`);
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  return payload as T;
}

export async function fetchNetworkInfo(): Promise<NetworkInfoResponse> {
  return requestJson<NetworkInfoResponse>("/api/network/info");
}

export async function fetchScannedDevices(): Promise<ScannedDeviceResponse[]> {
  return requestJson<ScannedDeviceResponse[]>("/api/scan/devices");
}

export async function fetchPortScan(ip: string): Promise<PortScanResponse> {
  return requestJson<PortScanResponse>(`/api/scan/ports?ip=${encodeURIComponent(ip)}`);
}

export async function fetchOsGuess(ip: string): Promise<OsGuessResponse> {
  return requestJson<OsGuessResponse>(`/api/scan/os?ip=${encodeURIComponent(ip)}`);
}

export async function fetchVendor(mac: string): Promise<VendorResponse> {
  return requestJson<VendorResponse>(`/api/scan/vendor?mac=${encodeURIComponent(mac)}`);
}

export async function fetchPing(ip: string): Promise<PingResponse> {
  return requestJson<PingResponse>(`/api/ping?ip=${encodeURIComponent(ip)}`);
}

export async function fetchActivitySnapshot(): Promise<ActivitySnapshotResponse> {
  return requestJson<ActivitySnapshotResponse>("/api/activity/snapshot");
}

export async function fetchTrustLive(): Promise<TrustLiveResponse> {
  return requestJson<TrustLiveResponse>("/api/trust/live");
}

export async function fetchAdvancedReport(): Promise<AdvancedReportResponse> {
  return requestJson<AdvancedReportResponse>("/api/report/advanced");
}

export async function fetchSpeedHistory(): Promise<SpeedHistoryApiItem[]> {
  return requestJson<SpeedHistoryApiItem[]>("/api/speed/history");
}

export async function fetchLiveBandwidth(): Promise<LiveBandwidthResponse> {
  return requestJson<LiveBandwidthResponse>("/api/speed/live");
}

export async function runOoklaSpeedTest(): Promise<OoklaSpeedTestResponse> {
  const response = await fetch("/api/speedtest/run", {
    method: "POST",
    cache: "no-store",
  });
  const payload = (await response.json()) as OoklaSpeedTestResponse & ApiError;
  if (!response.ok) {
    throw new Error(payload.error || "Failed to run Ookla speed test.");
  }
  return payload;
}

export async function runTerminalCommand(cmd: TerminalCommand, args = ""): Promise<TerminalRunResponse> {
  const response = await fetch("/api/terminal/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ cmd, args }),
  });

  const payload = (await response.json()) as TerminalRunResponse & ApiError;
  if (!response.ok) {
    throw new Error(payload.error || "Terminal command failed.");
  }

  return payload;
}
