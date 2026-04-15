import type { TokenAccumulation } from './scanner.js';
import type { Chain } from './providers/types.js';

export type Classification = 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW' | 'NOISE';

export interface ConvergenceSignal {
  id: string;
  token: string;
  symbol: string;
  chains: Chain[];
  score: number;
  netflowUsd: number;
  buyVolumeUsd: number;
  smartMoneyBuyers: number;
  classification: Classification;
  reason: string;
  detectedAt: number;
}

export function detectConvergence(accumulations: TokenAccumulation[]): ConvergenceSignal[] {
  const signals: ConvergenceSignal[] = [];

  for (const token of accumulations) {
    if (token.chains.length < 2) continue;

    const s = computeScore(token);
    const cls = classify(s);
    if (cls === 'NOISE') continue;

    signals.push({
      id: `conv-${token.symbol}-${Date.now()}`,
      token: token.address,
      symbol: token.symbol,
      chains: token.chains,
      score: s,
      netflowUsd: token.totalNetflow,
      buyVolumeUsd: token.totalBuyVolume,
      smartMoneyBuyers: token.smartMoneyBuyers,
      classification: cls,
      reason: buildReason(token, s),
      detectedAt: Date.now(),
    });
  }

  return signals.sort((a, b) => b.score - a.score);
}

function computeScore(token: TokenAccumulation): number {
  const chainBase = Math.min(token.chains.length * 20, 100);
  const volumeFactor = Math.min(
    Math.log10(Math.max(Math.abs(token.totalNetflow) + token.totalBuyVolume, 1)) / 7,
    1.0,
  );
  const buyerFactor = Math.min(token.smartMoneyBuyers / 10, 1.0);
  return Math.round(Math.min(Math.max(
    (chainBase * 0.5) + (volumeFactor * 30) + (buyerFactor * 20),
    0,
  ), 100));
}

function classify(score: number): Classification {
  if (score >= 80) return 'EXTREME';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  if (score >= 20) return 'LOW';
  return 'NOISE';
}

function buildReason(token: TokenAccumulation, score: number): string {
  const parts: string[] = [];
  parts.push(`${token.symbol} detected on ${token.chains.length} chains (${token.chains.join(', ')})`);

  if (token.totalNetflow > 1_000_000) {
    parts.push(`$${(token.totalNetflow / 1_000_000).toFixed(1)}M net inflow from smart money`);
  } else if (token.totalNetflow > 1_000) {
    parts.push(`$${(token.totalNetflow / 1_000).toFixed(0)}K net inflow from smart money`);
  }

  if (token.smartMoneyBuyers > 5) {
    parts.push(`${token.smartMoneyBuyers} independent smart money wallets accumulating`);
  }

  if (score >= 80) {
    parts.push('EXTREME convergence: multiple chains + high volume + many buyers');
  } else if (score >= 60) {
    parts.push('Strong cross-chain accumulation pattern');
  }

  return parts.join('. ') + '.';
}

export function formatForAI(signals: ConvergenceSignal[]): string {
  if (signals.length === 0) return 'No cross-chain convergence signals detected in this scan.';

  let out = `Cross-Chain Convergence Report (${new Date().toISOString()}):\n\n`;

  for (const sig of signals.slice(0, 10)) {
    out += `Token: ${sig.symbol}\n`;
    out += `  Chains: ${sig.chains.join(', ')}\n`;
    out += `  Score: ${sig.score}/100 (${sig.classification})\n`;
    out += `  Net Flow: $${sig.netflowUsd.toLocaleString()}\n`;
    out += `  Buy Volume: $${sig.buyVolumeUsd.toLocaleString()}\n`;
    out += `  SM Buyers: ${sig.smartMoneyBuyers}\n`;
    out += `  ${sig.reason}\n\n`;
  }

  return out;
}
