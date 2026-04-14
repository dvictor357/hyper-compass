"use client";

import type { Syndicate } from "@/lib/types";

const fmtUsd = (v: number): string => {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

export function SyndicatePanel({ syndicates }: { syndicates: Syndicate[] }) {
  return (
    <div className="space-y-2">
      {syndicates.map((syn) => (
        <div key={syn.id} className="bg-[#0a0e1a]/50 border border-[#1a2240] rounded-lg p-2.5 hover:border-[#4488ff]/30 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-[#e0e6f0]">{syn.token}</span>
              <span className="text-[10px] font-mono text-[#e0e6f0]/40">{syn.id}</span>
            </div>
            <span className={`font-mono font-bold text-sm ${syn.coordinationScore >= 80 ? 'text-[#00ff88]' : syn.coordinationScore >= 60 ? 'text-[#4488ff]' : 'text-[#ff3366]'}`}>
              {syn.coordinationScore}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
            <div><span className="text-[#e0e6f0]/40 block">Wallets</span><span className="text-[#e0e6f0]/80">{syn.wallets.length}</span></div>
            <div><span className="text-[#e0e6f0]/40 block">Chains</span><span className="text-[#4488ff]/80">{syn.chains.join(', ')}</span></div>
            <div><span className="text-[#e0e6f0]/40 block">Value</span><span className="text-[#00ff88]/80">{fmtUsd(syn.totalValueUsd)}</span></div>
            <div><span className="text-[#e0e6f0]/40 block">Window</span><span className="text-[#e0e6f0]/60">{syn.windowMinutes}m</span></div>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#e0e6f0]/30">Controller: <span className="text-[#cc44ff]/60">{syn.controller?.slice(0, 10)}...</span></span>
          </div>

          <div className="mt-1.5 h-1 bg-[#1a2240] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${syn.coordinationScore}%`, backgroundColor: syn.coordinationScore >= 80 ? '#00ff88' : syn.coordinationScore >= 60 ? '#4488ff' : '#ff9f1c' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
