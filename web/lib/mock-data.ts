import type {
  Chain, NetflowEntry, ConvergenceSignal, AIAnalysis, AlphaSignal,
  Syndicate, SyndicateReport, SignalRecord, HeatmapCell, GraphNode, GraphLink,
  DivergenceEntry,
} from './types';

const CHAINS: Chain[] = ['ethereum', 'solana', 'base', 'arbitrum', 'polygon', 'optimism', 'avalanche', 'bnb'];
const TOKENS = ['ETH', 'SOL', 'LINK', 'PEPE', 'ARB', 'OP', 'AVAX', 'BNB', 'AERO', 'JUP'];

const RAW_FLOWS: Record<string, Record<string, number>> = {
  ethereum: { ETH: 2450000, LINK: 560000, PEPE: 890000, UNI: 340000, AAVE: 210000 },
  solana: { SOL: 1870000, JUP: 720000, BONK: 430000, PYTH: 280000 },
  base: { ETH: 1120000, AERO: 560000, BRETT: 340000 },
  arbitrum: { ETH: 980000, ARB: 420000, GMX: 310000, LINK: 190000 },
  polygon: { MATIC: 450000, LINK: 180000 },
  optimism: { ETH: 670000, OP: 290000 },
  avalanche: { AVAX: 380000 },
  bnb: { BNB: 520000, CAKE: 180000 },
};

export function getHeatmapData(): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  let maxAbs = 0;
  const flat: { chain: Chain; token: string; value: number }[] = [];

  for (const chain of CHAINS) {
    const flows = RAW_FLOWS[chain] || {};
    for (const token of TOKENS) {
      const value = flows[token] || 0;
      if (value !== 0) {
        flat.push({ chain, token, value });
        if (Math.abs(value) > maxAbs) maxAbs = Math.abs(value);
      }
    }
  }

  for (const entry of flat) {
    cells.push({
      chain: entry.chain,
      token: entry.token,
      value: entry.value,
      intensity: maxAbs > 0 ? Math.abs(entry.value) / maxAbs : 0,
    });
  }

  return cells;
}

export function getNetflowEntries(): NetflowEntry[] {
  const entries: NetflowEntry[] = [];
  const traders: Record<string, Record<string, number>> = {
    ethereum: { ETH: 12, LINK: 5, PEPE: 7, UNI: 4, AAVE: 3 },
    solana: { SOL: 9, JUP: 6, BONK: 8, PYTH: 4 },
    base: { ETH: 8, AERO: 5, BRETT: 6 },
    arbitrum: { ETH: 7, ARB: 4, GMX: 3, LINK: 2 },
    polygon: { MATIC: 5, LINK: 3 },
    optimism: { ETH: 5, OP: 3 },
    avalanche: { AVAX: 4 },
    bnb: { BNB: 4, CAKE: 3 },
  };

  for (const chain of CHAINS) {
    const flows = RAW_FLOWS[chain] || {};
    const t = traders[chain] || {};
    for (const [token, flow] of Object.entries(flows)) {
      entries.push({
        tokenSymbol: token,
        chain,
        netFlow24hUsd: flow,
        traderCount: t[token] || 1,
      });
    }
  }

  return entries.sort((a, b) => Math.abs(b.netFlow24hUsd) - Math.abs(a.netFlow24hUsd));
}

export function getConvergenceSignals(): ConvergenceSignal[] {
  return [
    {
      id: 'conv-ETH-1', token: '0xeeee', symbol: 'ETH',
      chains: ['ethereum', 'base', 'arbitrum', 'optimism'],
      convergenceScore: 89, netflowUsd: 5220000, buyVolumeUsd: 2520000,
      smartMoneyBuyers: 32, classification: 'EXTREME',
      reason: 'ETH detected on 4 chains. $5.2M net inflow. 32 smart money wallets accumulating.',
      detectedAt: Date.now() - 3600000,
    },
    {
      id: 'conv-LINK-2', token: '0x5149', symbol: 'LINK',
      chains: ['ethereum', 'arbitrum', 'polygon'],
      convergenceScore: 72, netflowUsd: 930000, buyVolumeUsd: 460000,
      smartMoneyBuyers: 10, classification: 'HIGH',
      reason: 'LINK detected on 3 chains. Strong accumulation ahead of CCIP v2.',
      detectedAt: Date.now() - 7200000,
    },
    {
      id: 'conv-SOL-3', token: 'So111', symbol: 'SOL',
      chains: ['solana'],
      convergenceScore: 58, netflowUsd: 1870000, buyVolumeUsd: 890000,
      smartMoneyBuyers: 9, classification: 'MODERATE',
      reason: 'SOL strong single-chain accumulation. $1.9M inflow from 9 wallets.',
      detectedAt: Date.now() - 10800000,
    },
    {
      id: 'conv-PEPE-4', token: '0x6982', symbol: 'PEPE',
      chains: ['ethereum'],
      convergenceScore: 45, netflowUsd: 890000, buyVolumeUsd: 450000,
      smartMoneyBuyers: 7, classification: 'MODERATE',
      reason: 'PEPE accumulation by smart traders. Coordinated whale activity.',
      detectedAt: Date.now() - 14400000,
    },
    {
      id: 'conv-ARB-5', token: '0x912c', symbol: 'ARB',
      chains: ['arbitrum'],
      convergenceScore: 38, netflowUsd: 420000, buyVolumeUsd: 180000,
      smartMoneyBuyers: 4, classification: 'LOW',
      reason: 'ARB moderate accumulation. 4 smart money wallets building positions.',
      detectedAt: Date.now() - 18000000,
    },
  ];
}

export function getAIAnalyses(): AIAnalysis[] {
  const signals = getConvergenceSignals();
  return signals.map((s) => ({
    id: `ai-${s.id}`,
    signalId: s.id,
    thesis: thesisFor(s.symbol, s),
    conviction: Math.min(s.convergenceScore + 5, 95),
    timeHorizon: s.convergenceScore >= 70 ? '72h' : '1w',
    risks: ['Market downturn risk', 'Smart money could be hedging', 'Regulatory uncertainty'],
    catalysts: ['Protocol upgrade', 'Fund rebalancing cycle', 'Cross-chain activity increase'],
    historicalPattern: `Similar to ${s.symbol} ${12 + Math.floor(s.convergenceScore / 5)}% rally in Q3 2025`,
    generatedAt: Date.now(),
    model: 'anthropic/claude-sonnet-4',
  }));
}

function thesisFor(symbol: string, signal: ConvergenceSignal): string {
  const map: Record<string, string> = {
    ETH: `Smart money accumulating ETH across ${signal.chains.length} chains with $${(signal.netflowUsd / 1e6).toFixed(1)}M net inflow. ${signal.smartMoneyBuyers} independent fund wallets building positions simultaneously, suggesting institutional-grade conviction.`,
    LINK: `Chainlink accumulation on ${signal.chains.length} chains with $${(signal.netflowUsd / 1e6).toFixed(1)}M inflow. Funds positioning ahead of CCIP v2. Cross-chain pattern suggests whales expect a catalyst within 1-2 weeks.`,
    SOL: `Solana ecosystem accumulation with $${(signal.netflowUsd / 1e6).toFixed(1)}M inflow from ${signal.smartMoneyBuyers} wallets. Likely positioning for Firedancer upgrade and DePIN narrative.`,
    PEPE: `Meme token accumulation by ${signal.smartMoneyBuyers} smart traders. Unusual convergence suggests coordinated whale activity ahead of exchange listing or social catalyst.`,
    ARB: `Arbitrum moderate accumulation from ${signal.smartMoneyBuyers} wallets. Positioning ahead of Stylus expansion and potential fee switch governance proposal.`,
  };
  return map[symbol] || `${symbol} unusual smart money accumulation $${(signal.netflowUsd / 1e6).toFixed(1)}M across ${signal.chains.length} chain(s).`;
}

export function getAlphaSignals(): AlphaSignal[] {
  const convs = getConvergenceSignals();
  const analyses = getAIAnalyses();
  return convs.map((conv, i) => {
    const ai = analyses[i];
    const composite = Math.round(conv.convergenceScore * 0.6 + ai.conviction * 0.4);
    let classification: AlphaSignal['classification'] = 'WEAK';
    if (composite >= 75) classification = 'STRONG_BUY';
    else if (composite >= 55) classification = 'BUY';
    else if (composite >= 35) classification = 'WATCH';

    return {
      id: `signal-${conv.symbol}-${Date.now() + i}`,
      symbol: conv.symbol,
      chains: conv.chains,
      convergenceScore: conv.convergenceScore,
      aiConviction: ai.conviction,
      compositeScore: composite,
      classification,
      thesis: ai.thesis,
      risks: ai.risks,
      catalysts: ai.catalysts,
      timeHorizon: ai.timeHorizon,
      historicalPattern: ai.historicalPattern,
      netflowUsd: conv.netflowUsd,
      buyVolumeUsd: conv.buyVolumeUsd,
      smartMoneyBuyers: conv.smartMoneyBuyers,
      detectedAt: conv.detectedAt,
      analyzedAt: ai.generatedAt,
    };
  });
}

function genWallets(count: number, prefix: string): string[] {
  return Array.from({ length: count }, (_, i) => {
    const hex = (i * 7 + 42).toString(16).padStart(4, '0');
    return `${prefix}${hex}${'a'.repeat(34)}`.slice(0, 42);
  });
}

export function getSyndicateReport(): SyndicateReport {
  const now = Date.now();
  return {
    syndicates: [
      {
        id: 'syn-ETH-1', token: 'ETH', wallets: genWallets(7, '0xd8dA'),
        chains: ['ethereum', 'base', 'arbitrum'],
        totalValueUsd: 4200000, coordinationScore: 92,
        controller: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        firstTradeTime: now - 1200000, lastTradeTime: now - 300000, windowMinutes: 15,
      },
      {
        id: 'syn-LINK-2', token: 'LINK', wallets: genWallets(5, '0xAb58'),
        chains: ['ethereum', 'arbitrum'],
        totalValueUsd: 1800000, coordinationScore: 78,
        controller: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
        firstTradeTime: now - 2400000, lastTradeTime: now - 900000, windowMinutes: 25,
      },
      {
        id: 'syn-PEPE-3', token: 'PEPE', wallets: genWallets(4, '0xFe2e'),
        chains: ['ethereum'],
        totalValueUsd: 890000, coordinationScore: 65,
        controller: '0xFe2e15D4A5B9BbC7A63B7A4e3E17b42B24a75cf4',
        firstTradeTime: now - 3600000, lastTradeTime: now - 1800000, windowMinutes: 30,
      },
      {
        id: 'syn-SOL-4', token: 'SOL', wallets: genWallets(6, '0x7xKX'),
        chains: ['solana'],
        totalValueUsd: 2100000, coordinationScore: 58,
        controller: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        firstTradeTime: now - 5400000, lastTradeTime: now - 2700000, windowMinutes: 45,
      },
    ],
    totalWalletsAnalyzed: 847,
    totalTradesAnalyzed: 3291,
    scanTimestamp: now,
  };
}

export function getSyndicateGraphData(): { nodes: GraphNode[]; links: GraphLink[] } {
  const report = getSyndicateReport();
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  for (const syn of report.syndicates) {
    for (const wallet of syn.wallets) {
      nodes.push({
        id: wallet,
        label: wallet.slice(0, 8) + '...',
        group: syn.id,
        size: wallet === syn.controller ? 12 : 6,
        isController: wallet === syn.controller,
      });
    }
    for (const wallet of syn.wallets) {
      if (wallet !== syn.controller && syn.controller) {
        links.push({ source: syn.controller, target: wallet, value: syn.totalValueUsd / syn.wallets.length });
      }
    }
  }

  return { nodes, links };
}

export function getDivergenceData(): DivergenceEntry[] {
  return [
    { token: 'ETH', smPosition: 85, marketOdds: 62, divergence: 23, direction: 'bullish' },
    { token: 'SOL', smPosition: 72, marketOdds: 58, divergence: 14, direction: 'bullish' },
    { token: 'LINK', smPosition: 68, marketOdds: 45, divergence: 23, direction: 'bullish' },
    { token: 'PEPE', smPosition: 55, marketOdds: 71, divergence: 16, direction: 'bearish' },
    { token: 'ARB', smPosition: 40, marketOdds: 52, divergence: 12, direction: 'bearish' },
    { token: 'OP', smPosition: 48, marketOdds: 44, divergence: 4, direction: 'bullish' },
    { token: 'AVAX', smPosition: 35, marketOdds: 38, divergence: 3, direction: 'bearish' },
    { token: 'BNB', smPosition: 42, marketOdds: 50, divergence: 8, direction: 'bearish' },
  ].sort((a, b) => b.divergence - a.divergence);
}

export function getSignalHistory(): SignalRecord[] {
  const now = Date.now();
  const DAY = 86400000;
  return [
    { id: 'sig-001', timestamp: now - 14 * DAY, type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 88, priceAtSignal: 3180, priceAfter24h: 3295, priceAfter48h: 3340, priceAfter7d: 3520, outcome: 'correct' },
    { id: 'sig-002', timestamp: now - 13 * DAY, type: 'syndicate', token: 'LINK', direction: 'bullish', conviction: 75, priceAtSignal: 16.80, priceAfter24h: 17.45, priceAfter48h: 17.90, priceAfter7d: 18.20, outcome: 'correct' },
    { id: 'sig-003', timestamp: now - 12 * DAY, type: 'convergence', token: 'SOL', direction: 'bullish', conviction: 82, priceAtSignal: 142, priceAfter24h: 148, priceAfter48h: 151, priceAfter7d: 156, outcome: 'correct' },
    { id: 'sig-004', timestamp: now - 11 * DAY, type: 'divergence', token: 'PEPE', direction: 'bullish', conviction: 62, priceAtSignal: 0.0000082, priceAfter24h: 0.0000078, priceAfter48h: 0.0000075, priceAfter7d: 0.0000071, outcome: 'incorrect' },
    { id: 'sig-005', timestamp: now - 10 * DAY, type: 'convergence', token: 'ARB', direction: 'bullish', conviction: 71, priceAtSignal: 0.98, priceAfter24h: 1.02, priceAfter48h: 1.05, priceAfter7d: 1.08, outcome: 'correct' },
    { id: 'sig-006', timestamp: now - 9 * DAY, type: 'syndicate', token: 'ETH', direction: 'bullish', conviction: 90, priceAtSignal: 3310, priceAfter24h: 3280, priceAfter48h: 3250, priceAfter7d: 3190, outcome: 'incorrect' },
    { id: 'sig-007', timestamp: now - 8 * DAY, type: 'convergence', token: 'AVAX', direction: 'bullish', conviction: 65, priceAtSignal: 28.50, priceAfter24h: 29.10, priceAfter48h: 29.80, priceAfter7d: 30.40, outcome: 'correct' },
    { id: 'sig-008', timestamp: now - 7 * DAY, type: 'divergence', token: 'BNB', direction: 'bearish', conviction: 58, priceAtSignal: 580, priceAfter24h: 575, priceAfter48h: 568, priceAfter7d: 560, outcome: 'correct' },
    { id: 'sig-009', timestamp: now - 7 * DAY, type: 'convergence', token: 'LINK', direction: 'bullish', conviction: 79, priceAtSignal: 17.20, priceAfter24h: 17.85, priceAfter48h: 18.10, priceAfter7d: 18.45, outcome: 'correct' },
    { id: 'sig-010', timestamp: now - 6 * DAY, type: 'syndicate', token: 'SOL', direction: 'bullish', conviction: 84, priceAtSignal: 149, priceAfter24h: 146, priceAfter48h: 143, priceAfter7d: 140, outcome: 'incorrect' },
    { id: 'sig-011', timestamp: now - 5 * DAY, type: 'convergence', token: 'OP', direction: 'bullish', conviction: 68, priceAtSignal: 2.05, priceAfter24h: 2.12, priceAfter48h: 2.18, priceAfter7d: 2.25, outcome: 'correct' },
    { id: 'sig-012', timestamp: now - 5 * DAY, type: 'divergence', token: 'PEPE', direction: 'bullish', conviction: 55, priceAtSignal: 0.0000075, priceAfter24h: 0.0000072, priceAfter48h: 0.0000079, priceAfter7d: 0.0000085, outcome: 'correct' },
    { id: 'sig-013', timestamp: now - 4 * DAY, type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 92, priceAtSignal: 3350, priceAfter24h: 3420, priceAfter48h: 3480, priceAfter7d: 3550, outcome: 'correct' },
    { id: 'sig-014', timestamp: now - 4 * DAY, type: 'syndicate', token: 'ARB', direction: 'bullish', conviction: 60, priceAtSignal: 1.05, priceAfter24h: 1.03, priceAfter48h: 1.01, priceAfter7d: 0.98, outcome: 'incorrect' },
    { id: 'sig-015', timestamp: now - 3 * DAY, type: 'convergence', token: 'LINK', direction: 'bullish', conviction: 85, priceAtSignal: 18.10, priceAfter24h: 18.65, priceAfter48h: 19.00, priceAfter7d: 19.40, outcome: 'correct' },
    { id: 'sig-016', timestamp: now - 3 * DAY, type: 'divergence', token: 'SOL', direction: 'bullish', conviction: 72, priceAtSignal: 152, priceAfter24h: 149, priceAfter48h: 147, priceAfter7d: 145, outcome: 'incorrect' },
    { id: 'sig-017', timestamp: now - 2 * DAY, type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 86, priceAtSignal: 3420, priceAfter24h: 3490, priceAfter48h: 3520, outcome: 'correct' },
    { id: 'sig-018', timestamp: now - 1 * DAY, type: 'syndicate', token: 'PEPE', direction: 'bullish', conviction: 70, priceAtSignal: 0.0000089, priceAfter24h: 0.0000092, outcome: 'pending' },
    { id: 'sig-019', timestamp: now - 0.5 * DAY, type: 'convergence', token: 'LINK', direction: 'bullish', conviction: 78, priceAtSignal: 18.45, outcome: 'pending' },
    { id: 'sig-020', timestamp: now - 0.25 * DAY, type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 91, priceAtSignal: 3490, outcome: 'pending' },
  ];
}

export function calcAccuracyReport(signals: SignalRecord[]) {
  const resolved = signals.filter(s => s.outcome === 'correct' || s.outcome === 'incorrect');
  const correct = resolved.filter(s => s.outcome === 'correct');

  let totalRet24 = 0, cnt24 = 0, totalRet48 = 0, cnt48 = 0;
  for (const s of resolved) {
    if (s.priceAfter24h && s.priceAtSignal) {
      const ret = ((s.priceAfter24h - s.priceAtSignal) / s.priceAtSignal) * 100;
      totalRet24 += s.direction === 'bearish' ? -ret : ret;
      cnt24++;
    }
    if (s.priceAfter48h && s.priceAtSignal) {
      const ret = ((s.priceAfter48h - s.priceAtSignal) / s.priceAtSignal) * 100;
      totalRet48 += s.direction === 'bearish' ? -ret : ret;
      cnt48++;
    }
  }

  const byType: Record<string, { total: number; correct: number; rate: number }> = {};
  for (const type of ['syndicate', 'convergence', 'divergence'] as const) {
    const t = resolved.filter(s => s.type === type);
    const c = t.filter(s => s.outcome === 'correct');
    byType[type] = { total: t.length, correct: c.length, rate: t.length > 0 ? Math.round((c.length / t.length) * 100) : 0 };
  }

  return {
    totalSignals: signals.length,
    resolvedSignals: resolved.length,
    correct: correct.length,
    incorrect: resolved.length - correct.length,
    accuracyRate: resolved.length > 0 ? Math.round((correct.length / resolved.length) * 100) : 0,
    avgReturn24h: cnt24 > 0 ? Math.round((totalRet24 / cnt24) * 100) / 100 : 0,
    avgReturn48h: cnt48 > 0 ? Math.round((totalRet48 / cnt48) * 100) / 100 : 0,
    byType,
  };
}
