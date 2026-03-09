"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw, Shield } from "lucide-react";
import AnimatedButton from "@/components/AnimatedButton";
import BrandLogo from "@/components/BrandLogo";
import Card from "@/components/Card";
import CircularScore from "@/components/CircularScore";
import LiveBandwidthWidget from "@/components/LiveBandwidthWidget";
import ProgressBar from "@/components/ProgressBar";
import { fetchActivitySnapshot, fetchNetworkInfo, fetchTrustLive, type NetworkInfoResponse, type TrustLiveResponse } from "@/lib/api";
import useAutoRefresh from "@/lib/useAutoRefresh";
import useI18n from "@/lib/useI18n";
import useSettings from "@/lib/useSettings";

type WarningItem = {
  id: string;
  deviceLabel: string;
  details: string;
  severity: "warn" | "critical";
  timestamp: string;
};

export default function HomePage() {
  const router = useRouter();
  const t = useI18n();
  const { settings } = useSettings();
  const isSq = settings.language === "sq";
  const ui = isSq
    ? {
        unknownNetwork: "Rrjet i panjohur",
        wifiIp: "IP Wi-Fi",
        lanIp: "IP LAN",
        gateway: "Porta hyrëse",
        excellent: "Shkëlqyeshëm",
        encryption: "Enkriptimi",
        stability: "Qëndrueshmëria",
        dnsConsistency: "Qëndrueshmëria e DNS",
        routerBehavior: "Sjellja e ruterit",
        trustFallback: "Vlerësimi i Besueshmërisë 2.0 po përshtatet me sjelljen e rrjetit.",
        suspiciousWarnings: "Paralajmërime për pajisje të dyshimta",
        active: "aktive",
        noAlerts: "Nuk ka alarme",
        noSuspicious: "Nuk u zbulua aktivitet i dyshimtë i pajisjeve në skanimet e fundit.",
      }
    : {
        unknownNetwork: "Unknown Network",
        wifiIp: "Wi-Fi IP",
        lanIp: "LAN IP",
        gateway: "Gateway",
        excellent: "Excellent",
        encryption: "Encryption",
        stability: "Stability",
        dnsConsistency: "DNS Consistency",
        routerBehavior: "Router Behavior",
        trustFallback: "Live Trust Score 2.0 is adapting to network behavior.",
        suspiciousWarnings: "Suspicious Device Warnings",
        active: "active",
        noAlerts: "No alerts",
        noSuspicious: "No suspicious device activity detected in recent scans.",
      };

  const [networkInfo, setNetworkInfo] = useState<NetworkInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trust, setTrust] = useState<TrustLiveResponse | null>(null);
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const inFlightRef = useRef(false);

  const loadNetworkInfo = useCallback(
    async (showLoading: boolean) => {
      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      if (showLoading) {
        setLoading(true);
      }

      try {
        const data = await fetchNetworkInfo();
        setNetworkInfo(data);
        setLoadError(null);
        setLastUpdatedAt(Date.now());
      } catch (error) {
        const message = error instanceof Error ? error.message : t.offlineFallback;
        setLoadError(message);
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    },
    [t.offlineFallback],
  );

  useEffect(() => {
    void loadNetworkInfo(true);
  }, [loadNetworkInfo]);

  useAutoRefresh(() => loadNetworkInfo(false), 60000);

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      const next = await fetchTrustLive().catch(() => null);
      if (active && next) {
        setTrust(next);
      }
      const nextDelay = 2200 + Math.floor(Math.random() * 1500);
      timeoutId = setTimeout(tick, nextDelay);
    };

    void tick();
    return () => {
      active = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      const snapshot = await fetchActivitySnapshot().catch(() => null);
      if (active && snapshot?.events) {
        const suspicious: WarningItem[] = snapshot.events
          .filter((event) => event.type === "security_alert" || event.type === "device_added")
          .filter((event) => event.severity === "warn" || event.severity === "critical")
          .slice(0, 4)
          .map((event): WarningItem => ({
            id: event.id,
            deviceLabel: event.deviceLabel,
            details: event.details,
            severity: event.severity === "critical" ? "critical" : "warn",
            timestamp: event.timestamp,
          }));
        setWarnings(suspicious);
      }
      timeoutId = setTimeout(tick, 120000);
    };

    void tick();
    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const displayNetwork = useMemo(
    () => ({
      ssid: networkInfo?.ssid || ui.unknownNetwork,
      ip: networkInfo?.localIp || "0.0.0.0",
      wifiIp: networkInfo?.wifiIp || "",
      lanIp: networkInfo?.lanIp || "",
      gateway: networkInfo?.gateway || "N/A",
      dnsServers: networkInfo?.dnsServers ?? [],
    }),
    [networkInfo, ui.unknownNetwork],
  );

  const statusText = useMemo(() => {
    if (loadError) {
      return t.offlineFallback;
    }

    if (!lastUpdatedAt) {
      return loading ? t.loadingNetworkDetails : t.offlineFallback;
    }

    const ageSeconds = Math.max(0, Math.floor((now - lastUpdatedAt) / 1000));
    if (ageSeconds <= 5) {
      return t.live;
    }

    return `${t.lastUpdated} ${ageSeconds}s`;
  }, [lastUpdatedAt, loadError, loading, now, t.lastUpdated, t.live, t.loadingNetworkDetails, t.offlineFallback]);

  return (
    <main className="space-y-4 pb-4 md:space-y-6 md:pb-8">
      <header className="flex items-center justify-between gap-3 px-1 pt-3 md:px-0 md:pt-1">
        <div className="flex items-center gap-3">
          <BrandLogo compact className="h-11 w-11" />
          <div>
            <h1 className="text-2xl font-semibold text-[color:var(--np-text)]">{t.homeTitle}</h1>
            <p className="text-sm text-[color:var(--np-muted)]">{t.dashboardTitle}</p>
          </div>
        </div>

        <AnimatedButton
          className="rounded-xl px-3 py-2 text-sm font-medium"
          onClick={() => void loadNetworkInfo(true)}
          disabled={loading}
          loading={loading}
          variant="ghost"
        >
          <RefreshCcw size={16} className="text-[color:var(--np-primary)]" />
          {t.refresh}
        </AnimatedButton>
      </header>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-5">
          <p className="text-base font-semibold text-[color:var(--np-text)]">{displayNetwork.ssid}</p>
          <p className="text-sm text-[color:var(--np-muted)]">IP: {displayNetwork.ip}</p>
          {displayNetwork.wifiIp && <p className="text-sm text-[color:var(--np-muted)]">{ui.wifiIp}: {displayNetwork.wifiIp}</p>}
          {displayNetwork.lanIp && <p className="text-sm text-[color:var(--np-muted)]">{ui.lanIp}: {displayNetwork.lanIp}</p>}
          <p className="text-sm text-[color:var(--np-muted)]">{ui.gateway}: {displayNetwork.gateway}</p>
          {displayNetwork.dnsServers.length > 0 && (
            <p className="text-sm text-[color:var(--np-muted)]">DNS: {displayNetwork.dnsServers.join(", ")}</p>
          )}
          <div className="mt-4 inline-flex rounded-full border border-[color:var(--np-border)] bg-[color:var(--np-surface)] px-3 py-1 text-xs text-[color:var(--np-muted)]">
            {statusText}
          </div>
        </Card>

        <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[color:var(--np-text)]">{t.wifiTrustScore}</h2>
            <span className="font-medium text-emerald-400">{trust?.badge || ui.excellent}</span>
          </div>

          <div className="my-4">
            <CircularScore score={trust?.score || 90} />
          </div>

          <div className="space-y-3">
            {[
              { label: ui.encryption, value: trust?.encryption ?? 95 },
              { label: ui.stability, value: trust?.stability ?? 92 },
              { label: ui.dnsConsistency, value: trust?.dnsConsistency ?? 88 },
              { label: ui.routerBehavior, value: trust?.routerBehavior ?? 85 },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-sm text-[color:var(--np-muted)]">
                  <span>{m.label}</span>
                  <span>{m.value}%</span>
                </div>
                <ProgressBar value={m.value} showLabel={false} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[color:var(--np-muted)]">{trust?.recommendation || ui.trustFallback}</p>
        </Card>
      </div>

      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[color:var(--np-text)]">{ui.suspiciousWarnings}</h2>
          <span className={`text-xs font-medium ${warnings.length > 0 ? "text-[color:var(--np-danger)]" : "text-[color:var(--np-muted)]"}`}>
            {warnings.length > 0 ? `${warnings.length} ${ui.active}` : ui.noAlerts}
          </span>
        </div>

        {warnings.length === 0 && (
          <p className="text-sm text-[color:var(--np-muted)]">{ui.noSuspicious}</p>
        )}

        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((warning) => (
              <div key={warning.id} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
                <p className="text-sm font-semibold text-red-300">{warning.deviceLabel}</p>
                <p className="text-xs text-red-200/90">{warning.details}</p>
                <p className="mt-1 text-[11px] text-red-200/70">{new Date(warning.timestamp).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <LiveBandwidthWidget />

      <AnimatedButton
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-semibold md:max-w-md"
        onClick={() => {
          setGeneratingReport(true);
          router.push("/report");
        }}
        loading={generatingReport}
        disabled={generatingReport}
      >
        <Shield size={20} />
        {t.generateReport}
      </AnimatedButton>
    </main>
  );
}
