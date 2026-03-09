"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnimatedButton from "@/components/AnimatedButton";
import Card from "@/components/Card";
import { Activity, Filter, RefreshCcw } from "lucide-react";
import { fetchActivitySnapshot, type ActivityDevice } from "@/lib/api";
import { getPollingIntervalMs } from "@/lib/settings";
import useAutoRefresh from "@/lib/useAutoRefresh";
import useSettings from "@/lib/useSettings";

type ActivityEventType = "device_added" | "device_removed" | "went_offline" | "came_online" | "latency_spike" | "security_alert";

type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  deviceLabel: string;
  details: string;
  severity: "info" | "warn" | "critical";
  timestamp: string;
};

function toDeviceKey(device: ActivityDevice): string {
  return `${device.ip}-${device.mac}`;
}

function toDeviceLabel(device: ActivityDevice): string {
  return device.name || device.ip;
}

export default function ActivityPage() {
  const { settings } = useSettings();
  const isSq = settings.language === "sq";
  const ui = isSq
    ? {
        title: "Aktiviteti i Rrjetit",
        online: "Në linjë",
        offline: "Jashtë linje",
        total: "Gjithsej",
        eventFilter: "Filtri i ngjarjeve",
        allEvents: "Të gjitha ngjarjet",
        eventType: {
          device_added: "Pajisje e shtuar",
          device_removed: "Pajisje e hequr",
          came_online: "U lidh",
          went_offline: "Doli jashtë linje",
          latency_spike: "Rritje e vonesës",
          security_alert: "Alarm sigurie",
        },
        onlyOnline: "Shfaq vetëm pajisjet në linjë",
        feedTitle: "Rrjedha e Ngjarjeve",
        loading: "Po ngarkohet pamja e aktivitetit...",
        noEvents: "Nuk ka ende ngjarje. Mbajeni këtë faqe të hapur për historik në kohë reale.",
        scannedDevices: "Pajisjet e Skanuara",
        noMatching: "Asnjë pajisje nuk përputhet me filtrat aktualë.",
        onlineStatus: "Në linjë",
        offlineStatus: "Jashtë linje",
        loadError: "Ngarkimi i pamjes së aktivitetit dështoi.",
      }
    : {
        title: "Network Activity",
        online: "Online",
        offline: "Offline",
        total: "Total",
        eventFilter: "Event Filter",
        allEvents: "All events",
        eventType: {
          device_added: "Device added",
          device_removed: "Device removed",
          came_online: "Came online",
          went_offline: "Went offline",
          latency_spike: "Latency spike",
          security_alert: "Security alert",
        },
        onlyOnline: "Show only online devices",
        feedTitle: "Event Feed",
        loading: "Loading activity snapshot...",
        noEvents: "No events yet. Keep this page open to build live history.",
        scannedDevices: "Scanned Devices",
        noMatching: "No devices match current filters.",
        onlineStatus: "Online",
        offlineStatus: "Offline",
        loadError: "Failed to load activity snapshot.",
      };

  const [devices, setDevices] = useState<ActivityDevice[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [eventFilter, setEventFilter] = useState<"all" | ActivityEventType>("all");
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);
  const inFlightRef = useRef(false);

  const refreshSnapshot = useCallback(async (showLoading: boolean) => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const payload = await fetchActivitySnapshot();
      setDevices(payload.scannedDevices);
      setEvents((payload.events ?? []).map((event) => ({
        id: event.id,
        type: event.type,
        deviceLabel: event.deviceLabel,
        details: event.details,
        severity: event.severity,
        timestamp: event.timestamp,
      })));
      setLoadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : ui.loadError;
      setLoadError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      inFlightRef.current = false;
    }
  }, [ui.loadError]);

  useAutoRefresh(() => refreshSnapshot(false), getPollingIntervalMs(settings));

  useEffect(() => {
    void refreshSnapshot(true);
  }, [refreshSnapshot]);

  const visibleDevices = useMemo(() => {
    return devices.filter((device) => {
      if (!settings.showOfflineDevices && !device.online) return false;
      if (showOnlyOnline && !device.online) return false;
      return true;
    });
  }, [devices, settings.showOfflineDevices, showOnlyOnline]);

  const filteredEvents = useMemo(() => {
    const base = eventFilter === "all" ? events : events.filter((event) => event.type === eventFilter);
    if (!showOnlyOnline) {
      return base;
    }

    const onlineIps = new Set(
      devices
        .filter((device) => device.online)
        .map((device) => device.ip),
    );

    return base.filter((event) => {
      if (event.type === "came_online" || event.type === "latency_spike" || event.type === "security_alert") {
        return true;
      }
      for (const ip of onlineIps) {
        if (event.details.includes(ip) || event.deviceLabel.includes(ip)) {
          return true;
        }
      }
      return false;
    });
  }, [devices, eventFilter, events, showOnlyOnline]);

  const onlineCount = devices.filter((device) => device.online).length;
  const totalCount = showOnlyOnline ? onlineCount : devices.length;
  const offlineCount = showOnlyOnline ? 0 : Math.max(0, devices.length - onlineCount);

  return (
    <main className="space-y-4 pb-4 md:space-y-6 md:pb-8">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-[44px] font-bold text-white sm:text-[36px]">{ui.title}</h1>
        <AnimatedButton
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5"
          onClick={() => void refreshSnapshot(false)}
          loading={refreshing}
          disabled={refreshing}
          variant="ghost"
        >
          <RefreshCcw size={20} className="text-[color:var(--np-primary)]" />
        </AnimatedButton>
      </header>

      <section className="grid grid-cols-3 gap-3 md:max-w-2xl">
        <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4"><p className="text-[24px] text-white/50 sm:text-[18px]">{ui.online}</p><p className="text-[48px] font-bold text-[color:var(--np-accent)] sm:text-[38px]">{onlineCount}</p></Card>
        <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4"><p className="text-[24px] text-white/50 sm:text-[18px]">{ui.offline}</p><p className="text-[48px] font-bold text-[color:var(--np-warn)] sm:text-[38px]">{offlineCount}</p></Card>
        <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4"><p className="text-[24px] text-white/50 sm:text-[18px]">{ui.total}</p><p className="text-[48px] font-bold text-white sm:text-[38px]">{totalCount}</p></Card>
      </section>

      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-white/65">
            <Filter size={16} />
            <span className="text-xs uppercase tracking-wide">{ui.eventFilter}</span>
          </div>
          <select
            className="rounded-xl border border-[color:var(--np-border)] bg-[color:var(--np-surface)] px-3 py-2 text-sm text-white"
            value={eventFilter}
            onChange={(event) => setEventFilter(event.target.value as "all" | ActivityEventType)}
          >
            <option value="all">{ui.allEvents}</option>
            <option value="device_added">{ui.eventType.device_added}</option>
            <option value="device_removed">{ui.eventType.device_removed}</option>
            <option value="came_online">{ui.eventType.came_online}</option>
            <option value="went_offline">{ui.eventType.went_offline}</option>
            <option value="latency_spike">{ui.eventType.latency_spike}</option>
            <option value="security_alert">{ui.eventType.security_alert}</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={showOnlyOnline}
              onChange={(event) => setShowOnlyOnline(event.target.checked)}
              className="h-4 w-4 rounded border-[color:var(--np-border)] bg-[color:var(--np-surface)]"
            />
            {ui.onlyOnline}
          </label>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <Activity size={22} className="text-[color:var(--np-primary)]" />
        <h2 className="text-[40px] font-semibold text-white sm:text-[32px]">{ui.feedTitle}</h2>
      </div>

      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
        {loading && <p className="text-sm text-white/60">{ui.loading}</p>}
        {!loading && loadError && <p className="text-sm text-[color:var(--np-danger)]">{loadError}</p>}
        {!loading && !loadError && filteredEvents.length === 0 && (
          <p className="text-sm text-white/60">{ui.noEvents}</p>
        )}
        {!loading && !loadError && filteredEvents.length > 0 && (
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{ui.eventType[event.type]} - {event.deviceLabel}</p>
                  <p className={`text-xs ${event.severity === "critical" ? "text-[color:var(--np-danger)]" : event.severity === "warn" ? "text-[color:var(--np-warn)]" : "text-white/50"}`}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <p className="mt-1 text-sm text-white/70">{event.details}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <h2 className="text-[34px] font-semibold text-white sm:text-[28px]">{ui.scannedDevices}</h2>
      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
        {!loading && visibleDevices.length === 0 && <p className="text-sm text-white/60">{ui.noMatching}</p>}
        {visibleDevices.length > 0 && (
          <div className="space-y-2">
            {visibleDevices.map((device) => (
              <div key={toDeviceKey(device)} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-white">{toDeviceLabel(device)}</p>
                  <p className="text-xs text-white/50">{device.ip} - {device.mac}</p>
                </div>
                <p className={`text-xs font-medium ${device.online ? "text-[color:var(--np-accent)]" : "text-white/45"}`}>
                  {device.online ? `${ui.onlineStatus}${device.latencyMs != null ? ` - ${device.latencyMs}ms` : ""}` : ui.offlineStatus}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
