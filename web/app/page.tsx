"use client";

import { useState } from "react";
import { getPipelineTokens, getPipelineMetrics, getWhaleNetworkGraph } from "@/lib/pipeline-data";
import { TokenCard } from "@/components/TokenCard";
import { PipelineFlow } from "@/components/PipelineFlow";
import { CoordinationGraph } from "@/components/CoordinationGraph";
import { WhaleNetwork3D } from "@/components/WhaleNetwork3D";
import { RiskRadar } from "@/components/RiskRadar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

type TabId = "overview" | "network" | "risk" | "pipeline";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "network", label: "3D Whale Network" },
  { id: "risk", label: "Risk Analysis" },
  { id: "pipeline", label: "Pipeline Status" },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const tokens = getPipelineTokens();
  const metrics = getPipelineMetrics();
  const graphData = getWhaleNetworkGraph();
  const best = tokens.reduce((a, b) => (a.riskScore > b.riskScore ? a : b));

  return (
    <div className="max-w-[1600px] mx-auto p-4 space-y-4">
      <div className="grid grid-cols-6 gap-3">
        <HeroStat label="CLI Calls" value="52" sub="Real API calls" color="green" />
        <HeroStat label="Endpoints" value="15" sub="Unique used" color="blue" />
        <HeroStat label="Tokens" value={String(metrics.tokensScanned)} sub="Analyzed" color="magenta" />
        <HeroStat label="Whales" value={String(metrics.whalesProfiled)} sub="Profiled" color="blue" />
        <HeroStat label="Clusters" value={String(metrics.coordinationClusters)} sub="Detected" color="red" />
        <HeroStat label="Best Grade" value={best.riskGrade} sub={best.symbol} color="green" />
      </div>

      <div className="flex gap-1 bg-[#0f1528] border border-[#1a2240] rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-md transition-all ${
              activeTab === tab.id
                ? "bg-[#4488ff]/10 text-[#4488ff] border border-[#4488ff]/20"
                : "text-[#e0e6f0]/40 hover:text-[#e0e6f0]/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <SectionHeader title="Top Token Signals" sub="Ranked by risk-adjusted alpha score" />
              {tokens.slice(0, 3).map((t) => (
                <TokenCard key={t.symbol} token={t} />
              ))}
            </div>
            <div className="space-y-3">
              <SectionHeader title="Whale Coordination Network" sub="3D force-directed graph" />
              <div className="bg-[#0f1528] border border-[#1a2240] rounded-xl overflow-hidden" style={{ height: 520 }}>
                <ErrorBoundary>
                  <WhaleNetwork3D nodes={graphData.nodes} links={graphData.links} width={760} height={520} />
                </ErrorBoundary>
              </div>
            </div>
          </div>
          <div>
            <SectionHeader title="Coordination Detection" sub="BFS analysis of whale wallet relationships" />
            <CoordinationGraph />
          </div>
        </div>
      )}

      {activeTab === "network" && (
        <div className="space-y-4">
          <SectionHeader title="3D Whale Network" sub="Interactive 3D visualization. Click nodes to focus." />
          <div className="bg-[#0f1528] border border-[#1a2240] rounded-xl overflow-hidden" style={{ height: "calc(100vh - 240px)" }}>
            <ErrorBoundary>
              <WhaleNetwork3D
                nodes={graphData.nodes}
                links={graphData.links}
                width={1560}
                height={typeof window !== "undefined" ? window.innerHeight - 240 : 700}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {activeTab === "risk" && (
        <div className="space-y-4">
          <SectionHeader title="8-Factor Risk Analysis" sub="Each token scored across 8 risk dimensions" />
          <div className="grid grid-cols-2 gap-6">
            {tokens.map((t) => (
              <TokenCard key={t.symbol} token={t} expanded />
            ))}
          </div>
        </div>
      )}

      {activeTab === "pipeline" && (
        <div className="space-y-4">
          <SectionHeader title="Pipeline Execution Status" sub={`${metrics.pipelineDuration} with ${metrics.totalCalls} CLI calls`} />
          <PipelineFlow />
        </div>
      )}

      <div className="text-center text-[10px] font-mono text-[#e0e6f0]/20 py-4 border-t border-[#1a2240]">
        hyper-compass | {metrics.totalCalls} CLI calls across {metrics.uniqueEndpoints} endpoints | {new Date().toLocaleString()}
      </div>
    </div>
  );
}

function HeroStat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const cm: Record<string, { text: string; border: string; glow: string }> = {
    green: { text: "text-[#00ff88]", border: "border-[#00ff88]/15", glow: "shadow-[0_0_15px_rgba(0,255,136,0.08)]" },
    blue: { text: "text-[#4488ff]", border: "border-[#4488ff]/15", glow: "shadow-[0_0_15px_rgba(68,136,255,0.08)]" },
    magenta: { text: "text-[#cc44ff]", border: "border-[#cc44ff]/15", glow: "shadow-[0_0_15px_rgba(204,68,255,0.08)]" },
    red: { text: "text-[#ff3366]", border: "border-[#ff3366]/15", glow: "shadow-[0_0_15px_rgba(255,51,102,0.08)]" },
  };
  const c = cm[color] || cm.blue;
  return (
    <div className={`bg-[#0f1528] border ${c.border} ${c.glow} rounded-xl px-4 py-3 text-center`}>
      <div className="text-[9px] font-mono text-[#e0e6f0]/40 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-mono font-bold ${c.text}`}>{value}</div>
      <div className="text-[9px] font-mono text-[#e0e6f0]/25">{sub}</div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-sm font-mono font-bold text-[#e0e6f0]/80 uppercase tracking-wider">{title}</h2>
        <p className="text-[10px] font-mono text-[#e0e6f0]/30 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
