"use client";

import type { HeatmapCell } from "@/lib/types";

const CHAINS = ['ethereum', 'solana', 'base', 'arbitrum', 'polygon', 'optimism', 'avalanche', 'bnb'] as const;
const TOKENS = ['ETH', 'SOL', 'LINK', 'PEPE', 'ARB', 'OP', 'AVAX', 'BNB', 'AERO', 'JUP'] as const;

function getColor(intensity: number, value: number): string {
  if (value === 0) return 'rgba(26, 34, 64, 0.3)';
  const alpha = 0.2 + intensity * 0.8;
  return value > 0 ? `rgba(0, 255, 136, ${alpha})` : `rgba(255, 51, 102, ${alpha})`;
}

function fmtVal(v: number): string {
  if (v === 0) return '-';
  const abs = Math.abs(v);
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function NetflowHeatmap({ data }: { data: HeatmapCell[] }) {
  const cellMap = new Map(data.map((c) => [`${c.chain}-${c.token}`, c]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr>
            <th className="text-left text-[#e0e6f0]/40 py-1 px-2 w-20">Chain</th>
            {TOKENS.map((t) => <th key={t} className="text-center text-[#e0e6f0]/60 py-1 px-1 min-w-[60px]">{t}</th>)}
          </tr>
        </thead>
        <tbody>
          {CHAINS.map((chain) => (
            <tr key={chain} className="border-t border-[#1a2240]/50">
              <td className="text-[#4488ff]/70 py-1.5 px-2 capitalize text-[10px]">{chain}</td>
              {TOKENS.map((token) => {
                const cell = cellMap.get(`${chain}-${token}`);
                const value = cell?.value ?? 0;
                const intensity = cell?.intensity ?? 0;
                return (
                  <td key={`${chain}-${token}`} className="text-center py-1.5 px-1">
                    <div className="rounded px-1 py-0.5 text-[10px]" style={{ backgroundColor: getColor(intensity, value) }}>
                      {value !== 0
                        ? <span className={value > 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}>{fmtVal(value)}</span>
                        : <span className="text-[#e0e6f0]/10">-</span>
                      }
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-4 mt-3 text-[10px] font-mono text-[#e0e6f0]/40">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#00ff88]/20" /><span>Low inflow</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#00ff88]/60" /><span>Medium</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#00ff88]" /><span>High inflow</span></div>
      </div>
    </div>
  );
}
