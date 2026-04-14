"use client";

import { getPipelinePhases, getPipelineMetrics, getEndpointDistribution } from "@/lib/pipeline-data";

export function PipelineFlow() {
  const phases = getPipelinePhases();
  const metrics = getPipelineMetrics();
  const endpoints = getEndpointDistribution();
  const maxDur = Math.max(...phases.map((p) => parseFloat(p.duration)));
  const totalDur = phases.reduce((s, p) => s + parseFloat(p.duration), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total API Calls", value: "52", sub: "Real endpoints", accent: "green" },
          { label: "Unique Endpoints", value: "15", sub: "Across 7 phases", accent: "blue" },
          { label: "Pipeline Duration", value: "115.6s", sub: "End-to-end", accent: "cyan" },
          { label: "Avg Latency", value: "2.2s", sub: "Per API call", accent: "purple" },
        ].map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      <div className="bg-[#080d1a] border border-[#1a2240] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a2240]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_6px_#00ff8880]" />
            <span className="text-xs font-mono font-bold text-[#e0e6f0]/60 uppercase tracking-wider">Pipeline Execution Flow</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono text-[#00ff88]/40">6 complete</span>
            <span className="text-[9px] font-mono text-[#ff9f1c]/40">1 partial</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-[29px] top-0 bottom-0 w-px bg-gradient-to-b from-[#4488ff]/20 via-[#00ff88]/15 to-[#4488ff]/10" />
          {phases.map((phase, i) => {
            const dur = parseFloat(phase.duration);
            const pct = (dur / totalDur) * 100;
            const barW = Math.max((dur / maxDur) * 100, 8);
            const isErr = phase.status === "error";
            return (
              <div key={phase.name}>
                <div className="group flex items-center gap-0 px-3 py-2.5 hover:bg-[#0f1528]/60 transition-colors relative">
                  <div className="relative z-10 shrink-0 w-[34px] flex justify-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border ${isErr ? "bg-[#ff9f1c]/10 border-[#ff9f1c]/30 text-[#ff9f1c]" : "bg-[#00ff88]/8 border-[#00ff88]/20 text-[#00ff88]/80"}`}>
                      {i + 1}
                    </div>
                  </div>
                  <div className="w-36 shrink-0 pl-2">
                    <div className="text-[11px] font-mono font-bold text-[#e0e6f0]/80">{phase.name}</div>
                  </div>
                  <div className="flex-1 px-3">
                    <div className="h-7 bg-[#0f1528] rounded relative overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${barW}%`,
                          background: isErr ? "linear-gradient(90deg, rgba(255,159,28,0.2), rgba(255,159,28,0.4))" : `linear-gradient(90deg, rgba(0,255,136,0.1), rgba(68,136,255,${0.15 + pct * 0.005}))`,
                          borderLeft: isErr ? "2px solid #ff9f1c" : "2px solid #00ff88",
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right w-14">
                      <div className={`text-xs font-mono font-bold tabular-nums ${isErr ? "text-[#ff9f1c]" : "text-[#00ff88]/80"}`}>{phase.duration}</div>
                      <div className="text-[8px] font-mono text-[#e0e6f0]/20">{pct.toFixed(0)}%</div>
                    </div>
                    <div className="bg-[#4488ff]/8 border border-[#4488ff]/12 rounded px-1.5 py-0.5 w-14 text-center">
                      <span className="text-[10px] font-mono font-bold text-[#4488ff]/70">{phase.calls}</span>
                      <span className="text-[8px] font-mono text-[#4488ff]/30 ml-0.5">calls</span>
                    </div>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isErr ? "bg-[#ff9f1c] shadow-[0_0_4px_rgba(255,159,28,0.6)]" : "bg-[#00ff88] shadow-[0_0_4px_rgba(0,255,136,0.5)]"}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-2.5 border-t border-[#1a2240] text-[9px] font-mono text-[#e0e6f0]/20">
          {totalDur.toFixed(1)}s total execution
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#080d1a] border border-[#1a2240] rounded-xl p-4">
          <div className="text-xs font-mono font-bold text-[#e0e6f0]/60 uppercase tracking-wider mb-3">Endpoint Distribution ({metrics.totalCalls})</div>
          <div className="space-y-1.5">
            {endpoints.slice(0, 8).map((ep, i) => (
              <div key={ep.endpoint} className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#4488ff]/30 w-3 text-right">{i + 1}</span>
                <span className="text-[10px] font-mono text-[#e0e6f0]/45 w-28 truncate">{ep.endpoint}</span>
                <div className="flex-1 h-1.5 bg-[#0f1528] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(ep.calls / endpoints[0].calls) * 100}%`, background: "linear-gradient(90deg, #4488ff, #00ff88)" }} />
                </div>
                <span className="text-[10px] font-mono text-[#00ff88]/60 w-5 text-right">{ep.calls}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#080d1a] border border-[#1a2240] rounded-xl p-4">
          <div className="text-xs font-mono font-bold text-[#e0e6f0]/60 uppercase tracking-wider mb-3">Time Distribution by Phase</div>
          <div className="space-y-2">
            {phases.map((phase, i) => {
              const dur = parseFloat(phase.duration);
              const pct = (dur / totalDur) * 100;
              const isErr = phase.status === "error";
              return (
                <div key={phase.name} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-mono font-bold ${isErr ? "bg-[#ff9f1c]/10 text-[#ff9f1c]/60" : "bg-[#00ff88]/5 text-[#00ff88]/50"}`}>
                    {i + 1}
                  </div>
                  <span className="text-[10px] font-mono text-[#e0e6f0]/45 w-28 truncate">{phase.name}</span>
                  <div className="flex-1 h-1.5 bg-[#0f1528] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isErr ? "linear-gradient(90deg, #ff9f1c, #ff6633)" : "linear-gradient(90deg, #00ff88, #4488ff)" }} />
                  </div>
                  <span className={`text-[10px] font-mono w-12 text-right tabular-nums ${isErr ? "text-[#ff9f1c]/60" : "text-[#e0e6f0]/35"}`}>{phase.duration}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-[#1a2240]">
            <div className="text-[8px] font-mono text-[#e0e6f0]/20 mb-1.5">Cumulative timeline</div>
            <div className="h-3 rounded-full overflow-hidden flex">
              {phases.map((phase, i) => {
                const pct = (parseFloat(phase.duration) / totalDur) * 100;
                const isErr = phase.status === "error";
                return (
                  <div
                    key={phase.name}
                    className="h-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isErr ? "hsla(30, 100%, 55%, 0.4)" : `hsla(${140 + i * 20}, 80%, 50%, 0.2)`,
                      borderRight: i < phases.length - 1 ? "1px solid #080d1a" : "none",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  const cm: Record<string, { border: string; text: string; glow: string }> = {
    green: { border: "border-[#00ff88]/12", text: "text-[#00ff88]", glow: "shadow-[0_0_12px_rgba(0,255,136,0.04)]" },
    blue: { border: "border-[#4488ff]/12", text: "text-[#4488ff]", glow: "shadow-[0_0_12px_rgba(68,136,255,0.04)]" },
    cyan: { border: "border-[#00ccff]/12", text: "text-[#00ccff]", glow: "shadow-[0_0_12px_rgba(0,204,255,0.04)]" },
    purple: { border: "border-[#cc44ff]/12", text: "text-[#cc44ff]", glow: "shadow-[0_0_12px_rgba(204,68,255,0.04)]" },
  };
  const c = cm[accent] || cm.blue;
  return (
    <div className={`bg-[#080d1a] border ${c.border} ${c.glow} rounded-xl px-4 py-3`}>
      <div className="text-[9px] font-mono text-[#e0e6f0]/35 uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-mono font-bold ${c.text} tabular-nums`}>{value}</div>
      <div className="text-[9px] font-mono text-[#e0e6f0]/18 mt-0.5">{sub}</div>
    </div>
  );
}
