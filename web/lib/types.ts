export type Chain = 'ethereum' | 'solana' | 'base' | 'arbitrum' | 'polygon' | 'optimism' | 'avalanche' | 'bnb';

export interface NetflowEntry {
  tokenSymbol: string;
  chain: Chain;
  netFlow24hUsd: number;
  traderCount: number;
}

export interface ConvergenceSignal {
  id: string;
  token: string;
  symbol: string;
  chains: Chain[];
  convergenceScore: number;
  netflowUsd: number;
  buyVolumeUsd: number;
  smartMoneyBuyers: number;
  classification: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';
  reason: string;
  detectedAt: number;
}

export interface AIAnalysis {
  id: string;
  signalId: string;
  thesis: string;
  conviction: number;
  timeHorizon: string;
  risks: string[];
  catalysts: string[];
  historicalPattern: string;
  generatedAt: number;
  model: string;
}

export interface AlphaSignal {
  id: string;
  symbol: string;
  chains: string[];
  convergenceScore: number;
  aiConviction: number;
  compositeScore: number;
  classification: 'STRONG_BUY' | 'BUY' | 'WATCH' | 'WEAK';
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
  totalWalletsAnalyzed: number;
  totalTradesAnalyzed: number;
  scanTimestamp: number;
}

export interface SignalRecord {
  id: string;
  timestamp: number;
  type: 'syndicate' | 'convergence' | 'divergence';
  token: string;
  direction: 'bullish' | 'bearish';
  conviction: number;
  priceAtSignal: number;
  priceAfter24h?: number;
  priceAfter48h?: number;
  priceAfter7d?: number;
  outcome?: 'correct' | 'incorrect' | 'pending';
}

export interface HeatmapCell {
  chain: Chain;
  token: string;
  value: number;
  intensity: number;
}

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  size: number;
  isController: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}

export interface DivergenceEntry {
  token: string;
  smPosition: number;
  marketOdds: number;
  divergence: number;
  direction: 'bullish' | 'bearish';
}
