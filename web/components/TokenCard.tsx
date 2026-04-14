"use client";

import type { PipelineToken } from "@/lib/pipeline-data";
import { RiskRadar } from "./RiskRadar";

const GRADE_BORDER: Record<string, string> = {
  A: "border-[#00ff88]/30 shadow-[0_0_15px_rgba(0,255,136,0.15)]",
  B: "border-[#4488ff]/30 shadow-[0_0_15px_rgba(68,136,255,0.15)]",
  C: "border-[#ff9f1c]/30 shadow-[0_0_15px_rgba(255,159,28,0.15)]",
  D: "border-[#ff3366]/30 shadow-[0_0_15px_rgba(255,51,102,0.15)]",
  F: "border-[#ff0000]/30 shadow-[0_0_15px_rgba(255,0,0,0.15)]",
};

const GRADE_TEXT: Record<string, string> = {
  A: "text-[#00ff88]", B: "text-[#4488ff]", C: "text-[#ff9f1c]", D: "text-[#ff3366]", F: "text-[#ff0000]",
};

const CHAIN_BADGE: Record<string, { color: string; label: string }> = {
  base: { color: "bg-[#0052FF]/20 text-[#4488ff] border-[#0052FF]/30", label: "Base" },
  solana: { color: "bg-[#9945FF]/20 text-[#9945FF] border-[#9945FF]/30", label: "Solana" },
  ethereum: { color: "bg-[#627EEA]/20 text-[#627EEA] border-[#627EEA]/30", label: "Ethereum" },
};

const fmtUsd = (v: number): string => {
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

export function TokenCard({ token, expanded = false }: { token: PipelineToken; expanded?: boolean }) {
  const border = GRADE_BORDER[token.riskGrade] || GRADE_BORDER.C;
  const gradeText = GRADE_TEXT[token.riskGrade] || GRADE_TEXT.C;
  const chain = CHAIN_BADGE[token.chain] || CHAIN_BADGE.base;

  return (
    <div className={`bg-[#0f1528]/80 backdrop-blur-sm border rounded-xl p-4 transition-all hover:scale-[1.02] ${border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xl font-mono font-bold text-[#e0e6f0]">{token.symbol}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${chain.color}`}>{chain.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-mono font-bold ${gradeText}`}>{token.riskGrade}</span>
          <span className="text-[10px] font-mono text-[#e0e6f0]/40">{token.riskScore}/10</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <Metric label="Volume 24h" value={fmtUsd(token.volume24h)} color="blue" />
        <Metric label="SM Netflow" value={fmtUsd(token.smartMoneyNetFlow)} color={token.smartMoneyNetFlow > 0 ? "green" : "red"} />
        <Metric label="Price Change" value={`${token.priceChange > 0 ? "+" : ""}${token.priceChange.toFixed(2)}%`} color={token.priceChange > 0 ? "green" : "red"} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <Metric label="Market Cap" value={fmtUsd(token.marketCap)} color="blue" />
        <Metric label="B/S Ratio" value={token.buySellRatio.toFixed(2)} color={token.buySellRatio > 1 ? "green" : "red"} />
        <Metric label="Alpha Score" value={token.alphaScore.toFixed(1)} color="magenta" />
      </div>

      <div className="space-y-1.5 mb-3">
        {token.riskFactors.map((f) => (
          <div key={f.name} className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-[#e0e6f0]/40 w-20 text-right truncate">{f.name}</span>
            <div className="flex-1 h-1.5 bg-[#1a2240] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${f.score * 10}%`,
                  backgroundColor: f.pass ? (f.score >= 8 ? "#00ff88" : "#4488ff") : "#ff3366",
                }}
              />
            </div>
            <span className={`text-[9px] font-mono w-6 text-right ${f.pass ? "text-[#00ff88]/70" : "text-[#ff3366]/70"}`}>
              {f.score.toFixed(0)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg ${
          token.recommendation === "WATCH" ? "bg-[#ff9f1c]/10 text-[#ff9f1c] border border-[#ff9f1c]/20"
            : token.recommendation === "AVOID" ? "bg-[#ff3366]/10 text-[#ff3366] border border-[#ff3366]/20"
            : "bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20"
        }`}>
          {token.recommendation}
        </span>
        <span className="text-[10px] font-mono text-[#e0e6f0]/30">Conviction: {token.conviction.toFixed(1)}</span>
      </div>

      {expanded && (
        <div className="mt-4 flex justify-center">
          <RiskRadar factors={token.riskFactors} grade={token.riskGrade} score={token.riskScore} size={180} />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  const cm: Record<string, string> = { green: "text-[#00ff88]", red: "text-[#ff3366]", blue: "text-[#4488ff]", magenta: "text-[#cc44ff]" };
  return (
    <div className="bg-[#0a0e1a]/50 rounded-lg px-2 py-1.5">
      <div className="text-[8px] font-mono text-[#e0e6f0]/40 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-mono font-bold ${cm[color] || cm.blue}`}>{value}</div>
    </div>
  );
}
