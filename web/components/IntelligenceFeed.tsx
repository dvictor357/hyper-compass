"use client";

import type { AlphaSignal, AIAnalysis } from "@/lib/types";

function classColor(c: AlphaSignal['classification']): string {
  switch (c) {
    case 'STRONG_BUY': return 'text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/20';
    case 'BUY': return 'text-[#4488ff] bg-[#4488ff]/10 border-[#4488ff]/20';
    case 'WATCH': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    case 'WEAK': return 'text-[#ff3366] bg-[#ff3366]/10 border-[#ff3366]/20';
  }
}

export function IntelligenceFeed({ signals, analyses }: { signals: AlphaSignal[]; analyses: AIAnalysis[] }) {
  return (
    <div className="space-y-3">
      {signals.map((signal) => (
        <div key={signal.id} className="bg-[#0a0e1a]/50 border border-[#1a2240] rounded-lg p-3 hover:border-[#4488ff]/20 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${classColor(signal.classification)}`}>
                {signal.classification.replace('_', ' ')}
              </span>
              <span className="font-mono font-bold text-sm text-[#e0e6f0]">{signal.symbol}</span>
              <span className="text-[10px] font-mono text-[#e0e6f0]/30">{signal.chains.join(', ')}</span>
            </div>
            <span className="text-[10px] font-mono text-[#e0e6f0]/40">{signal.timeHorizon}</span>
          </div>

          <p className="text-xs text-[#e0e6f0]/70 leading-relaxed mb-2">{signal.thesis}</p>

          <div className="flex items-center gap-4 mb-2">
            <ScoreBar label="Convergence" value={signal.convergenceScore} color="#4488ff" />
            <ScoreBar label="AI Conviction" value={signal.aiConviction} color="#cc44ff" />
            <ScoreBar label="Composite" value={signal.compositeScore} color="#00ff88" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div>
              <span className="text-[#00ff88]/50 block mb-0.5">Catalysts</span>
              {signal.catalysts.slice(0, 2).map((c, i) => <div key={`cat-${i}`} className="text-[#e0e6f0]/40 truncate">+ {c}</div>)}
            </div>
            <div>
              <span className="text-[#ff3366]/50 block mb-0.5">Risks</span>
              {signal.risks.slice(0, 2).map((r, i) => <div key={`risk-${i}`} className="text-[#e0e6f0]/40 truncate">- {r}</div>)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between text-[9px] font-mono mb-0.5">
        <span className="text-[#e0e6f0]/30">{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-1 bg-[#1a2240] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
