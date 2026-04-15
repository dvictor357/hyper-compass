import type { Chain } from './providers/types.js';

export interface WalletTrade {
  wallet: string;
  token: string;
  chain: string;
  timestamp: number;
  valueUsd: number;
  side: 'buy' | 'sell';
  label?: string;
}

export interface Syndicate {
  id: string;
  token: string;
  wallets: string[];
  chains: string[];
  totalValueUsd: number;
  coordinationScore: number;
  controller?: string;
  firstTradeTime: number;
  lastTradeTime: number;
  windowMinutes: number;
}

export interface SyndicateReport {
  syndicates: Syndicate[];
  walletsAnalyzed: number;
  tradesAnalyzed: number;
  scannedAt: number;
}

const DEFAULT_WINDOW = 30;
const MIN_WALLETS = 3;

export function detectSyndicates(
  trades: WalletTrade[],
  windowMinutes: number = DEFAULT_WINDOW,
): SyndicateReport {
  const uniqueWallets = new Set(trades.map(t => t.wallet));
  const windowMs = windowMinutes * 60_000;

  const buys = trades.filter(t => t.side === 'buy');
  const byToken = groupByToken(buys);

  const syndicates: Syndicate[] = [];

  byToken.forEach((tokenTrades, token) => {
    const sorted = [...tokenTrades].sort((a, b) => a.timestamp - b.timestamp);
    const clusters = findClusters(sorted, windowMs);

    for (const cluster of clusters) {
      const wallets = [...new Set(cluster.map(t => t.wallet))];
      if (wallets.length < MIN_WALLETS) continue;

      const chains = [...new Set(cluster.map(t => t.chain))];
      const first = cluster[0];
      const last = cluster[cluster.length - 1];
      const spanMin = (last.timestamp - first.timestamp) / 60_000;

      syndicates.push({
        id: `syn-${token}-${first.timestamp}`,
        token,
        wallets,
        chains,
        totalValueUsd: cluster.reduce((s, t) => s + t.valueUsd, 0),
        coordinationScore: scoreCoordination(spanMin, windowMinutes, chains.length),
        controller: first.wallet,
        firstTradeTime: first.timestamp,
        lastTradeTime: last.timestamp,
        windowMinutes: Math.round(spanMin * 100) / 100,
      });
    }
  });

  syndicates.sort((a, b) => b.coordinationScore - a.coordinationScore);

  return {
    syndicates,
    walletsAnalyzed: uniqueWallets.size,
    tradesAnalyzed: trades.length,
    scannedAt: Date.now(),
  };
}

function groupByToken(trades: WalletTrade[]): Map<string, WalletTrade[]> {
  const map = new Map<string, WalletTrade[]>();
  for (const t of trades) {
    const key = t.token.toUpperCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return map;
}

function findClusters(sorted: WalletTrade[], windowMs: number): WalletTrade[][] {
  const clusters: WalletTrade[][] = [];
  let i = 0;

  while (i < sorted.length) {
    let best: WalletTrade[] | null = null;

    for (let j = i; j < sorted.length; j++) {
      if (sorted[j].timestamp - sorted[i].timestamp > windowMs) break;
      const window = sorted.slice(i, j + 1);
      if (new Set(window.map(t => t.wallet)).size >= MIN_WALLETS) {
        best = window;
      }
    }

    if (best) {
      clusters.push(best);
      i += best.length;
    } else {
      i++;
    }
  }

  return clusters;
}

function scoreCoordination(spanMin: number, windowMin: number, chainCount: number): number {
  const k = Math.LN2 / windowMin;
  let score = 100 * Math.exp(-k * spanMin);
  if (chainCount >= 2) score *= 1.2;
  return Math.round(Math.min(Math.max(score, 0), 100));
}

export function formatReport(report: SyndicateReport): string {
  if (report.syndicates.length === 0) {
    return `Syndicate Scan: ${report.tradesAnalyzed} trades from ${report.walletsAnalyzed} wallets analyzed. No coordinated groups detected.`;
  }

  let out = `Syndicate Detection Report (${new Date(report.scannedAt).toISOString()}):\n`;
  out += `Analyzed ${report.tradesAnalyzed} trades from ${report.walletsAnalyzed} wallets.\n`;
  out += `Found ${report.syndicates.length} syndicate(s):\n\n`;

  for (const syn of report.syndicates) {
    out += `[${syn.id}] ${syn.token}\n`;
    out += `  Wallets: ${syn.wallets.length} (${syn.wallets.map(w => w.slice(0, 8) + '...').join(', ')})\n`;
    out += `  Chains: ${syn.chains.join(', ')}\n`;
    out += `  Total Value: $${syn.totalValueUsd.toLocaleString()}\n`;
    out += `  Coordination: ${syn.coordinationScore}/100\n`;
    out += `  Window: ${syn.windowMinutes} min\n`;
    out += `  Controller: ${syn.controller?.slice(0, 10)}...\n`;
    out += `  Time: ${new Date(syn.firstTradeTime).toISOString()} → ${new Date(syn.lastTradeTime).toISOString()}\n\n`;
  }

  return out;
}
