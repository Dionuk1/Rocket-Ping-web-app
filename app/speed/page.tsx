"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, History, Upload, Wifi } from "lucide-react";
import Card from "@/components/Card";
import GoSpeedtestButton from "@/components/GoSpeedtestButton";
import StarshipCanvas from "@/components/StarshipCanvas";
import { fetchSpeedHistory, runOoklaSpeedTest, type OoklaSpeedTestResponse, type SpeedHistoryApiItem } from "@/lib/api";
import useSettings from "@/lib/useSettings";

type TestPhase = "idle" | "running" | "done" | "error";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function SpeedPage() {
  const { settings } = useSettings();
  const isSq = settings.language === "sq";
  const ui = isSq
    ? {
        connecting: "Po lidhet...",
        downloading: "Po shkarkohet...",
        uploading: "Po ngarkohet...",
        finalizing: "Po finalizohet...",
        complete: "Testi përfundoi",
        failed: "Testi i shpejtësisë dështoi",
        ready: "Gati për nisje",
        serverNotSelected: "Serveri nuk është zgjedhur",
        download: "Shkarkim",
        upload: "Ngarkim",
        recentTests: "Testet e Fundit",
        noTests: "Nuk ka ende teste. Kryeni një test për të ndërtuar historikun.",
        server: "Serveri",
      }
    : {
        connecting: "Connecting...",
        downloading: "Downloading...",
        uploading: "Uploading...",
        finalizing: "Finalizing...",
        complete: "Test complete",
        failed: "Speed test failed",
        ready: "Ready to run",
        serverNotSelected: "Server not selected",
        download: "Download",
        upload: "Upload",
        recentTests: "Recent Tests",
        noTests: "No tests yet. Run one to build history.",
        server: "Server",
      };

  const [history, setHistory] = useState<SpeedHistoryApiItem[]>([]);
  const [latestResult, setLatestResult] = useState<OoklaSpeedTestResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<TestPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const stored = await fetchSpeedHistory().catch(() => []);
      setHistory(stored);
    })();
  }, []);

  useEffect(() => {
    if (phase !== "running") return;

    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      setProgress((current) => {
        if (current >= 97) return 97;
        const rate = current < 30 ? 28 : current < 80 ? 15 : current < 95 ? 8 : 3;
        return Math.min(97, current + rate * dt);
      });

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [phase]);

  const currentDownload = latestResult?.downloadMbps ?? history[0]?.downloadMbps ?? 0;
  const currentUpload = latestResult?.uploadMbps ?? history[0]?.uploadMbps ?? 0;
  const currentPing = latestResult?.pingMs ?? history[0]?.pingMs ?? 0;

  const statusText = useMemo(() => {
    if (phase === "running") {
      if (progress < 30) return ui.connecting;
      if (progress < 80) return ui.downloading;
      if (progress < 95) return ui.uploading;
      return ui.finalizing;
    }
    if (phase === "done") return ui.complete;
    if (phase === "error") return errorText || ui.failed;
    return ui.ready;
  }, [errorText, phase, progress, ui.complete, ui.connecting, ui.downloading, ui.failed, ui.finalizing, ui.ready, ui.uploading]);

  const runSpeedTest = async () => {
    if (running) return;

    setRunning(true);
    setPhase("running");
    setProgress(0);
    setErrorText(null);

    try {
      const result = await runOoklaSpeedTest();
      setLatestResult(result);
      const nextHistory = await fetchSpeedHistory();
      setHistory(nextHistory);
      setProgress(100);
      setPhase("done");
      window.setTimeout(() => {
        setPhase("idle");
        setProgress(0);
      }, 900);
    } catch (error) {
      setPhase("error");
      setErrorText(error instanceof Error ? error.message : `${ui.failed}.`);
      window.setTimeout(() => {
        setPhase("idle");
        setProgress(0);
      }, 1400);
    } finally {
      setRunning(false);
    }
  };

  const ringProgress = clamp(progress, 0, 100);

  return (
    <main className="space-y-6 pb-8">
      <Card className="border-[color:var(--np-border)] bg-[linear-gradient(180deg,#121633_0%,#0a1224_100%)] p-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex justify-center">
            <GoSpeedtestButton state={phase} progress={ringProgress} phaseText={statusText} onClick={() => void runSpeedTest()} />
          </div>

          <div className="mt-10 grid items-center gap-5 text-center md:grid-cols-[1fr_auto_1fr] md:text-left">
            <div>
              <p className="text-4xl font-semibold text-[color:var(--np-text)]">{latestResult?.isp ?? "RocketPing"}</p>
              <p className="text-3xl text-[color:var(--np-muted)]">{latestResult?.publicIp ?? "0.0.0.0"}</p>
            </div>

            <div>
              <p className={phase === "error" ? "text-4xl text-[color:var(--np-danger)]" : "text-4xl text-[color:var(--np-text)]"}>
                {statusText}
              </p>
              <p className="text-2xl text-[color:var(--np-muted)]">
                {latestResult ? `${latestResult.serverName} (${latestResult.serverLocation})` : ui.serverNotSelected}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
        <StarshipCanvas progress={progress} phase={phase} />
      </Card>

      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="mb-1 flex items-center gap-2 text-sm text-[color:var(--np-muted)]"><Download size={16} />{ui.download}</p>
            <p className="text-3xl font-bold text-[color:var(--np-accent)]">{currentDownload.toFixed(1)}</p>
            <p className="text-sm text-[color:var(--np-muted)]">Mbps</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="mb-1 flex items-center gap-2 text-sm text-[color:var(--np-muted)]"><Upload size={16} />{ui.upload}</p>
            <p className="text-3xl font-bold text-[color:var(--np-primary-soft)]">{currentUpload.toFixed(1)}</p>
            <p className="text-sm text-[color:var(--np-muted)]">Mbps</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="mb-1 flex items-center gap-2 text-sm text-[color:var(--np-muted)]"><Wifi size={16} />Ping</p>
            <p className="text-3xl font-bold text-white">{currentPing.toFixed(0)}</p>
            <p className="text-sm text-[color:var(--np-muted)]">ms</p>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <History size={22} className="text-[color:var(--np-primary)]" />
        <h2 className="text-2xl font-semibold text-[color:var(--np-text)]">{ui.recentTests}</h2>
      </div>

      {history.length === 0 && (
        <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
          <p className="text-sm text-[color:var(--np-muted)]">{ui.noTests}</p>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {history.slice(0, 6).map((item) => (
          <Card key={item.id} className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
            <p className="text-sm text-[color:var(--np-muted)]">{new Date(item.timestamp).toLocaleString()}</p>
            <p className="mt-1 text-xs text-[color:var(--np-muted)]">{ui.server}: {item.targetHost}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <p className="text-[color:var(--np-accent)]">{item.downloadMbps.toFixed(1)} Mbps</p>
              <p className="text-[color:var(--np-primary-soft)]">{item.uploadMbps.toFixed(1)} Mbps</p>
              <p className="text-[color:var(--np-text)]">{item.pingMs} ms</p>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
