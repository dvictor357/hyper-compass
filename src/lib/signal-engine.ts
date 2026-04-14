import type { ConvergenceSignal } from './convergence.js';
import type { AIAnalysis } from './ai-analyzer.js';

export type SignalClass = 'STRONG_BUY' | 'BUY' | 'WATCH' | 'WEAK';

export interface AlphaSignal {
  id: string;
  symbol: string;
  chains: string[];
  convergenceScore: number;
  aiConviction: number;
  compositeScore: number;
  classification: SignalClass;
  thesis: string;
  risks: string[];
  catalysts: string[];
  timeHorizon: string;
  historicalPattern: string;
  netflowUsd: number;
  buyVolumeUsd: number;
  smartMoneyBuyers: number;
  detectedAt: number;
  analyzedAt: number;
}

export function createSignal(
  convergence: ConvergenceSignal,
  analysis: AIAnalysis,
): AlphaSignal {
  const compositeScore = Math.round(convergence.score * 0.6 + analysis.conviction * 0.4);

  return {
    id: `signal-${convergence.symbol}-${Date.now()}`,
    symbol: convergence.symbol,
    chains: convergence.chains,
    convergenceScore: convergence.score,
    aiConviction: analysis.conviction,
    compositeScore,
    classification: classify(compositeScore),
    thesis: analysis.thesis,
    risks: analysis.risks,
    catalysts: analysis.catalysts,
    timeHorizon: analysis.timeHorizon,
    historicalPattern: analysis.historicalPattern,
    netflowUsd: convergence.netflowUsd,
    buyVolumeUsd: convergence.buyVolumeUsd,
    smartMoneyBuyers: convergence.smartMoneyBuyers,
    detectedAt: convergence.detectedAt,
    analyzedAt: analysis.generatedAt,
  };
}

function classify(score: number): SignalClass {
  if (score >= 75) return 'STRONG_BUY';
  if (score >= 55) return 'BUY';
  if (score >= 35) return 'WATCH';
  return 'WEAK';
}

export function rankSignals(signals: AlphaSignal[]): AlphaSignal[] {
  return [...signals].sort((a, b) => b.compositeScore - a.compositeScore);
}

export function summarize(signals: AlphaSignal[]): string {
  if (signals.length === 0) return 'No actionable signals detected.';

  const strong = signals.filter(s => s.classification === 'STRONG_BUY').length;
  const buy = signals.filter(s => s.classification === 'BUY').length;
  const watch = signals.filter(s => s.classification === 'WATCH').length;

  let out = `Signal Report (${new Date().toISOString()}):\n`;
  out += `Total: ${signals.length} | STRONG_BUY: ${strong} | BUY: ${buy} | WATCH: ${watch}\n\n`;

  for (const sig of signals.slice(0, 5)) {
    out += `${sig.classification} ${sig.symbol} (${sig.compositeScore}/100)\n`;
    out += `  Chains: ${sig.chains.join(', ')}\n`;
    out += `  Thesis: ${sig.thesis.slice(0, 150)}...\n`;
    out += `  Net Flow: $${sig.netflowUsd.toLocaleString()} | Buyers: ${sig.smartMoneyBuyers}\n\n`;
  }

  return out;
}
