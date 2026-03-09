"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Laptop, RefreshCcw, Smartphone, Tablet, Tv, Wifi, X } from "lucide-react";
import AnimatedButton from "@/components/AnimatedButton";
import Card from "@/components/Card";
import { fetchPortScan, fetchScannedDevices, type PortScanResponse, type ScannedDeviceResponse } from "@/lib/api";
import { getPollingIntervalMs } from "@/lib/settings";
import useAutoRefresh from "@/lib/useAutoRefresh";
import useSettings from "@/lib/useSettings";

const iconMap = {
  tv: Tv,
  phone: Smartphone,
  tablet: Tablet,
  wifi: Wifi,
  laptop: Laptop,
} as const;

const iconCycle: Array<keyof typeof iconMap> = ["tv", "phone", "tablet", "laptop"];

type UiDevice = {
  id: string;
  name: string;
  nameSubtitle?: string;
  ip: string;
  mac: string;
  vendor?: string;
  osGuess?: string;
  openPortsSummary?: string;
  openPorts?: number[];
  icon: keyof typeof iconMap;
  statusText: string;
  online: boolean;
};

function ipTail(ip: string): string {
  const parts = ip.split(".");
  return parts[parts.length - 1] || ip;
}

function mapScannedToUi(scanned: ScannedDeviceResponse[], isSq: boolean): UiDevice[] {
  if (scanned.length === 0) {
    return [];
  }

  return scanned.map((item, index) => {
    const isGateway = item.ip.endsWith(".1") || /router|gateway|ruter|porta hyr[ëe]se/i.test(item.name ?? "");
    const icon = isGateway ? "wifi" : iconCycle[index % iconCycle.length];
    const name = item.name || (isGateway ? (isSq ? "Ruteri" : "Router") : `${isSq ? "Pajisja" : "Device"} ${ipTail(item.ip)}`);
    const sourceLabel =
      item.nameSource === "reverse_dns" ? (isSq ? "DNS i kundërt" : "Reverse DNS") :
      item.nameSource === "netbios" ? "NetBIOS" :
      item.nameSource === "dhcp_lookup" ? (isSq ? "Kërkim DHCP" : "DHCP lookup") :
      "";
    const confidenceLabel =
      item.nameConfidence === "high" ? (isSq ? "I lartë" : "High") :
      item.nameConfidence === "medium" ? (isSq ? "Mesatar" : "Medium") :
      item.nameConfidence === "low" ? (isSq ? "I ulët" : "Low") :
      "";
    const nameSubtitle = sourceLabel
      ? `${isSq ? "nga" : "from"} ${sourceLabel}${confidenceLabel ? ` • ${confidenceLabel}` : ""}`
      : undefined;

    return {
      id: `${item.ip}-${item.mac}`,
      name,
      nameSubtitle,
      ip: item.ip,
      mac: item.mac,
      vendor: item.vendor,
      osGuess: item.osGuess,
      openPortsSummary: item.openPortsSummary,
      openPorts: item.openPorts,
      icon,
      statusText: item.online
        ? (item.latencyMs != null ? `${isSq ? "Aktive" : "Active"} - ${item.latencyMs} ms` : (isSq ? "Aktive" : "Active"))
        : (isSq ? "Jashtë linje" : "Offline"),
      online: item.online,
    };
  });
}

export default function DevicesPage() {
  const { settings } = useSettings();
  const isSq = settings.language === "sq";
  const ui = isSq
    ? {
        title: "Pajisjet e Lidhura",
        total: "Pajisjet Totale",
        scanFailed: "Skanimi i pajisjeve lokale dështoi.",
        scanning: "Po skanohen hyrjet ARP...",
        noScan: "Nuk ka ende skanim.",
        live: "Në kohë reale",
        updated: "Përditësuar para",
        scanError: "Gabim skanimi",
        noDevices: "Nuk u gjet asnjë pajisje e skanuar ende.",
        ipAddress: "Adresa IP",
        macAddress: "Adresa MAC",
        vendor: "Prodhuesi",
        osGuess: "Sistemi i mundshëm",
        openPorts: "Portat e hapura",
        unknown: "I panjohur",
        deviceDetail: "Detajet e Pajisjes",
        quickPortScan: "Kryej skanim të shpejtë të portave",
        scanningPorts: "Po skanohen portat e zakonshme...",
        open: "HAPUR",
        closed: "mbyllur",
        os: "Sistemi",
      }
    : {
        title: "Connected Devices",
        total: "Total Devices",
        scanFailed: "Failed to scan local devices.",
        scanning: "Scanning ARP entries...",
        noScan: "No scan yet.",
        live: "Live",
        updated: "Last updated",
        scanError: "Scan error",
        noDevices: "No scanned devices found yet.",
        ipAddress: "IP Address",
        macAddress: "MAC Address",
        vendor: "Vendor",
        osGuess: "OS Guess",
        openPorts: "Open Ports",
        unknown: "Unknown",
        deviceDetail: "Device Detail",
        quickPortScan: "Run Quick Port Scan",
        scanningPorts: "Scanning common ports...",
        open: "OPEN",
        closed: "closed",
        os: "OS",
      };

  const [liveDevices, setLiveDevices] = useState<ScannedDeviceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [selectedDevice, setSelectedDevice] = useState<UiDevice | null>(null);
  const [portsDetail, setPortsDetail] = useState<PortScanResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const inFlightRef = useRef(false);

  const loadLiveDevices = useCallback(
    async (showLoading: boolean) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      if (showLoading || liveDevices.length === 0) setLoading(true);

      try {
        const scanned = await fetchScannedDevices();
        setLiveDevices(scanned);
        setLoadError(null);
        setLastUpdatedAt(Date.now());
      } catch (error) {
        const message = error instanceof Error ? error.message : ui.scanFailed;
        setLoadError(message);
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    },
    [liveDevices.length, ui.scanFailed],
  );

  useEffect(() => {
    void loadLiveDevices(true);
  }, [loadLiveDevices]);

  useAutoRefresh(() => loadLiveDevices(false), getPollingIntervalMs(settings));

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const uiDevices = useMemo(() => {
    const mapped = mapScannedToUi(liveDevices, isSq);
    if (!settings.showOfflineDevices) return mapped.filter((device) => device.online);
    return mapped;
  }, [isSq, liveDevices, settings.showOfflineDevices]);

  const statusText = useMemo(() => {
    if (loading) return ui.scanning;
    if (loadError) return loadError;
    if (!lastUpdatedAt) return ui.noScan;
    const ageSeconds = Math.max(0, Math.floor((now - lastUpdatedAt) / 1000));
    return ageSeconds <= 5 ? ui.live : `${ui.updated} ${ageSeconds}s`;
  }, [lastUpdatedAt, loadError, loading, now, ui.live, ui.noScan, ui.scanning, ui.updated]);

  const openDetails = async (device: UiDevice) => {
    setSelectedDevice(device);
    setPortsDetail(null);
    setDetailLoading(true);
    try {
      const ports = await fetchPortScan(device.ip);
      setPortsDetail(ports);
    } catch {
      setPortsDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <main className="space-y-4 pb-4 md:space-y-6 md:pb-8">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-[44px] font-bold text-white sm:text-[36px]">{ui.title}</h1>
        <AnimatedButton
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--np-primary)]"
          onClick={() => void loadLiveDevices(true)}
          disabled={loading}
          loading={loading}
          variant="primary"
        >
          <RefreshCcw size={24} className="text-white" />
        </AnimatedButton>
      </header>

      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-5 md:max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[30px] text-white/50 sm:text-[22px]">{ui.total}</p>
            <p className="text-[58px] font-bold text-white sm:text-[48px]">{uiDevices.length}</p>
          </div>
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[color:var(--np-surface)]">
            <Smartphone size={34} className="text-[color:var(--np-primary)]" />
          </div>
        </div>
        <p className="mt-2 text-xs text-white/45">{statusText}</p>
      </Card>

      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {!loading && uiDevices.length === 0 && (
          <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-5 md:col-span-2">
            <p className="text-sm text-white/60">{loadError ? `${ui.scanError}: ${loadError}` : ui.noDevices}</p>
          </Card>
        )}
        {uiDevices.map((device) => {
          const Icon = iconMap[device.icon];
          return (
            <button key={device.id} type="button" onClick={() => void openDetails(device)} className="text-left">
              <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-5 transition hover:border-[color:var(--np-primary)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/8">
                    <Icon size={30} className="text-[color:var(--np-primary)]" />
                  </div>
                  <div>
                    <p className="text-[34px] font-semibold text-white sm:text-[26px]">{device.name}</p>
                    {device.nameSubtitle && <p className="text-xs text-white/45">{device.nameSubtitle}</p>}
                    <p className="flex items-center gap-2 text-[22px] text-white/50 sm:text-[16px]">
                      <span className={`h-3 w-3 rounded-full ${device.online ? "bg-[color:var(--np-accent)]" : "bg-white/40"}`} />
                      {device.statusText}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="grid grid-cols-[1fr_auto] gap-y-2 text-sm sm:text-base">
                    <p className="text-white/50">{ui.ipAddress}</p>
                    <p className="font-medium text-white">{device.ip}</p>
                    <p className="text-white/50">{ui.macAddress}</p>
                    <p className="font-medium text-white">{device.mac}</p>
                    <p className="text-white/50">{ui.vendor}</p>
                    <p className="font-medium text-white">{device.vendor || ui.unknown}</p>
                    <p className="text-white/50">{ui.osGuess}</p>
                    <p className="font-medium text-white">{device.osGuess || ui.unknown}</p>
                    <p className="text-white/50">{ui.openPorts}</p>
                    <p className="font-medium text-white">{device.openPortsSummary || "N/A"}</p>
                  </div>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 md:items-center">
          <Card className="w-full max-w-xl border-[color:var(--np-border)] bg-[color:var(--np-card)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">{ui.deviceDetail}</h2>
              <button type="button" onClick={() => setSelectedDevice(null)} className="rounded-full p-2 text-white/70 hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-white/70">{selectedDevice.ip} - {selectedDevice.mac}</p>
            <p className="text-sm text-white/70">{ui.vendor}: {selectedDevice.vendor || ui.unknown} | {ui.os}: {selectedDevice.osGuess || ui.unknown}</p>
            <div className="mt-4">
              <AnimatedButton
                className="rounded-xl px-3 py-2 text-sm font-semibold"
                onClick={() => void openDetails(selectedDevice)}
                loading={detailLoading}
                disabled={detailLoading}
                variant="ghost"
              >
                {ui.quickPortScan}
              </AnimatedButton>
            </div>
            <div className="mt-4">
              {detailLoading && <p className="text-sm text-white/60">{ui.scanningPorts}</p>}
              {!detailLoading && portsDetail && (
                <div className="space-y-2">
                  <p className="text-sm text-white/70">{portsDetail.summary}</p>
                  <div className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-white/5 p-2 text-xs">
                    {portsDetail.ports.map((port) => (
                      <p key={port.port} className={port.open ? "text-[color:var(--np-warn)]" : "text-white/40"}>
                        {port.port} ({port.service}) - {port.open ? ui.open : ui.closed}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
