"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Network, RefreshCcw, Router } from "lucide-react";
import type { ForceGraphMethods } from "react-force-graph-2d";
import AnimatedButton from "@/components/AnimatedButton";
import Card from "@/components/Card";
import { fetchNetworkInfo, fetchScannedDevices, type ScannedDeviceResponse } from "@/lib/api";
import useAutoRefresh from "@/lib/useAutoRefresh";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type TopologyNode = {
  id: string;
  label: string;
  ip: string;
  status: "online" | "offline" | "router";
  kind: "router" | "device";
};

type TopologyLink = {
  source: string;
  target: string;
};

type GraphNodeLike = {
  id?: string | number;
  x?: number;
  y?: number;
  [key: string]: unknown;
};

const REFRESH_MS = 180_000;

export default function TopologyPage() {
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 520 });
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<ScannedDeviceResponse[]>([]);
  const [gateway, setGateway] = useState("192.168.1.1");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);

  const loadTopology = useCallback(async (showLoading: boolean) => {
    if (showLoading) setLoading(true);
    try {
      const [network, scanned] = await Promise.all([
        fetchNetworkInfo(),
        fetchScannedDevices(),
      ]);
      setGateway(network.gateway || "192.168.1.1");
      setDevices(scanned);
      setErrorText(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load topology data.";
      setErrorText(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTopology(true);
  }, [loadTopology]);

  useAutoRefresh(() => loadTopology(false), REFRESH_MS);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.max(280, Math.floor(entry.contentRect.width));
      const nextHeight = nextWidth < 640 ? 420 : 520;
      setSize({ width: nextWidth, height: nextHeight });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const routerId = `router-${gateway}`;
    const nodes: TopologyNode[] = [
      {
        id: routerId,
        label: "Router",
        ip: gateway,
        status: "router",
        kind: "router",
      },
    ];
    const links: TopologyLink[] = [];

    devices.forEach((device) => {
      if (!device.ip || device.ip === gateway) return;
      const nodeId = `device-${device.mac || device.ip}`;
      nodes.push({
        id: nodeId,
        label: device.name || "Device",
        ip: device.ip,
        status: device.online ? "online" : "offline",
        kind: "device",
      });
      links.push({ source: routerId, target: nodeId });
    });

    return { nodes, links };
  }, [devices, gateway]);

  const toTopologyNode = (node: GraphNodeLike): TopologyNode => ({
    id: String(node.id ?? ""),
    label: String(node.label ?? "Device"),
    ip: String(node.ip ?? "0.0.0.0"),
    status: node.status === "online" || node.status === "offline" || node.status === "router" ? node.status : "offline",
    kind: node.kind === "router" || node.kind === "device" ? node.kind : "device",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (graphRef.current && graphData.nodes.length > 1) {
        graphRef.current.zoomToFit(400, 80);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [graphData]);

  return (
    <main className="space-y-5 pb-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[42px] font-bold text-white sm:text-[36px]">Network Topology</h1>
          <p className="text-sm text-white/60">Router and connected devices map</p>
        </div>
        <AnimatedButton
          variant="ghost"
          className="rounded-xl px-3 py-2"
          onClick={() => void loadTopology(true)}
          disabled={loading}
          loading={loading}
        >
          <RefreshCcw size={16} className="text-[color:var(--np-primary)]" />
          Refresh
        </AnimatedButton>
      </header>

      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-white/70">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[color:var(--np-primary)]" />
            Router
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            Online device
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-slate-500" />
            Offline device
          </span>
        </div>

        {errorText && (
          <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {errorText}
          </p>
        )}

        <div ref={containerRef} className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#081228]">
          {size.width > 0 && (
            <ForceGraph2D
              ref={graphRef}
              width={size.width}
              height={size.height}
              graphData={graphData}
              backgroundColor="#081228"
              cooldownTicks={120}
              linkColor={() => "rgba(65, 130, 255, 0.4)"}
              linkWidth={1.6}
              nodeLabel={(node: GraphNodeLike) => {
                const n = toTopologyNode(node);
                return `${n.label} (${n.ip})`;
              }}
              onNodeClick={(node: GraphNodeLike) => setSelectedNode(toTopologyNode(node))}
              nodeVal={(node: GraphNodeLike) => (toTopologyNode(node).kind === "router" ? 18 : 11)}
              nodeCanvasObject={(node: GraphNodeLike, ctx: CanvasRenderingContext2D, globalScale: number) => {
                const n = toTopologyNode(node);
                const x = typeof node.x === "number" ? node.x : 0;
                const y = typeof node.y === "number" ? node.y : 0;
                const radius = n.kind === "router" ? 13 : 8;
                const color = n.status === "router" ? "#22d3ee" : n.status === "online" ? "#34d399" : "#64748b";

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = color;
                ctx.shadowBlur = 16;
                ctx.shadowColor = color;
                ctx.fill();
                ctx.shadowBlur = 0;

                const fontSize = Math.max(10, 13 / globalScale);
                ctx.font = `500 ${fontSize}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillStyle = "#dbeafe";
                ctx.fillText(n.label, x, y + radius + 4);
              }}
            />
          )}
        </div>
      </Card>

      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">Selected Node</h2>
        {!selectedNode && <p className="text-sm text-white/60">Click a node in the graph to view details.</p>}
        {selectedNode && (
          <div className="grid gap-2 text-sm text-white/80 sm:grid-cols-2">
            <p className="inline-flex items-center gap-2"><Network size={15} className="text-[color:var(--np-primary)]" />Name: {selectedNode.label}</p>
            <p className="inline-flex items-center gap-2"><Router size={15} className="text-[color:var(--np-primary)]" />IP: {selectedNode.ip}</p>
            <p>Status: {selectedNode.status}</p>
            <p>Type: {selectedNode.kind}</p>
          </div>
        )}
      </Card>
    </main>
  );
}
