"use client";

import { useEffect, useState } from "react";
import AnimatedButton from "@/components/AnimatedButton";
import Card from "@/components/Card";
import { fetchAdvancedReport, type AdvancedReportResponse } from "@/lib/api";

function fmtTime(value: string): string {
  return new Date(value).toLocaleString();
}

export default function ReportPage() {
  const [report, setReport] = useState<AdvancedReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchAdvancedReport();
        setReport(data);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "Failed to load report data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const trust = report?.trustLatest;

  return (
    <main className="space-y-4 pb-4 md:space-y-6 md:pb-8 report-print">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">NetPulse Advanced Security Report</h1>
        <p className="text-sm text-white/60">
          Generated: {report ? fmtTime(report.generatedAt) : "Loading..."}
        </p>
      </header>

      <AnimatedButton className="print-hide w-fit rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => window.print()}>
        Download PDF
      </AnimatedButton>

      {loading && <Card className="p-5"><p className="text-sm text-white/70">Loading report sections...</p></Card>}
      {errorText && <Card className="p-5"><p className="text-sm text-[color:var(--np-danger)]">{errorText}</p></Card>}

      {!loading && report && (
        <>
          <Card className="report-card p-5">
            <h2 className="text-lg font-semibold">Network Overview</h2>
            <div className="mt-2 grid gap-1 text-sm text-white/80">
              <p>SSID: {report.network.ssid}</p>
              <p>Local IP: {report.network.localIp}</p>
              <p>Gateway: {report.network.gateway}</p>
              <p>DNS: {report.network.dnsServers.length ? report.network.dnsServers.join(", ") : "N/A"}</p>
            </div>
          </Card>

          <Card className="report-card p-5">
            <h2 className="text-lg font-semibold">Trust Score 2.0</h2>
            <p className="mt-1 text-sm text-white/70">
              Latest sample: {trust ? `${trust.score} (${trust.badge}) at ${fmtTime(trust.timestamp)}` : "N/A"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <p>Encryption: <span className="font-semibold">{trust?.encryption ?? "-"}</span></p>
              <p>Stability: <span className="font-semibold">{trust?.stability ?? "-"}</span></p>
              <p>DNS Consistency: <span className="font-semibold">{trust?.dnsConsistency ?? "-"}</span></p>
              <p>Router Behavior: <span className="font-semibold">{trust?.routerBehavior ?? "-"}</span></p>
            </div>
          </Card>

          <Card className="report-card p-5">
            <h2 className="text-lg font-semibold">Device Inventory</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/60">
                    <th className="py-2">IP</th>
                    <th className="py-2">MAC</th>
                    <th className="py-2">Vendor</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {report.devices.map((device) => (
                    <tr key={`${device.ip}-${device.mac}`} className="border-b border-[color:var(--np-border)]">
                      <td className="py-2">{device.ip}</td>
                      <td className="py-2">{device.mac}</td>
                      <td className="py-2">{device.vendor ?? "Unknown"}</td>
                      <td className="py-2">{device.online ? "Online" : "Offline"}</td>
                      <td className="py-2">{(device.riskLevel ?? "low").toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="report-card p-5">
            <h2 className="text-lg font-semibold">SQLite Speed Test History</h2>
            <div className="mt-3 space-y-2">
              {report.speedHistory.length === 0 && <p className="text-sm text-white/60">No speed history saved yet.</p>}
              {report.speedHistory.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80">
                  <p className="font-medium">{fmtTime(item.timestamp)} - Target {item.targetHost}</p>
                  <p>Download {item.downloadMbps.toFixed(1)} Mbps | Upload {item.uploadMbps.toFixed(1)} Mbps | Ping {item.pingMs} ms</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="report-card p-5">
            <h2 className="text-lg font-semibold">Recent Activity Events</h2>
            <div className="mt-3 space-y-2">
              {report.activityEvents.length === 0 && <p className="text-sm text-white/60">No activity events recorded.</p>}
              {report.activityEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
                  <p className="font-medium text-white">{event.type} - {event.deviceLabel}</p>
                  <p className="text-white/70">{event.details}</p>
                  <p className="text-xs text-white/50">{fmtTime(event.timestamp)} | Severity: {event.severity}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </main>
  );
}
