"use client";

import type { DivergenceEntry } from "@/lib/types";

export function DivergenceBoard({ data }: { data: DivergenceEntry[] }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[60px_1fr_60px] gap-2 text-[10px] font-mono text-[#e0e6f0]/40 uppercase tracking-wider px-1">
        <span>Token</span>
        <span className="text-center">SM Position vs Market Odds</span>
        <span className="text-right">Gap</span>
      </div>

      {data.map((entry) => (
        <div key={entry.token} className="bg-[#0a0e1a]/50 border border-[#1a2240] rounded-lg p-2.5 hover:border-[#4488ff]/20 transition-colors">
          <div className="grid grid-cols-[60px_1fr_60px] gap-2 items-center">
            <span className="font-mono font-bold text-xs text-[#e0e6f0]">{entry.token}</span>

            <div className="relative h-6">
              <div className="absolute inset-0 bg-[#1a2240]/50 rounded-full" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#e0e6f0]/10" />
              <div className="absolute top-0.5 h-5 w-1.5 rounded-sm bg-[#00ff88]" style={{ left: `${entry.smPosition}%` }} />
              <div className="absolute top-0.5 h-5 w-1.5 rounded-sm bg-[#ff3366]" style={{ left: `${entry.marketOdds}%` }} />
              <div
                className="absolute top-2 h-2 rounded-full opacity-20"
                style={{
                  left: `${Math.min(entry.smPosition, entry.marketOdds)}%`,
                  width: `${entry.divergence}%`,
                  backgroundColor: entry.direction === 'bullish' ? '#00ff88' : '#ff3366',
                }}
              />
            </div>

            <div className="text-right">
              <span className={`font-mono font-bold text-xs ${entry.divergence >= 15 ? (entry.direction === 'bullish' ? 'text-[#00ff88]' : 'text-[#ff3366]') : 'text-[#e0e6f0]/50'}`}>
                {entry.divergence > 0 ? '+' : ''}{entry.divergence}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1 text-[9px] font-mono text-[#e0e6f0]/30">
            <span>SM: <span className="text-[#00ff88]/60">{entry.smPosition}</span></span>
            <span>MKT: <span className="text-[#ff3366]/60">{entry.marketOdds}</span></span>
            <span className={entry.direction === 'bullish' ? 'text-[#00ff88]/50' : 'text-[#ff3366]/50'}>
              {entry.direction === 'bullish' ? '\u25B2 SM More Bullish' : '\u25BC SM More Bearish'}
            </span>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-4 mt-2 text-[9px] font-mono text-[#e0e6f0]/30">
        <div className="flex items-center gap-1"><div className="w-2 h-3 rounded-sm bg-[#00ff88]" /><span>SM Position</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-3 rounded-sm bg-[#ff3366]" /><span>Market Odds</span></div>
      </div>
    </div>
  );
}
