export interface CallRecord {
  endpoint: string;
  method: 'EXEC' | 'STREAM';
  latencyMs: number;
  status: string;
  cacheStatus: 'HIT' | 'MISS' | 'N/A';
  role: string;
  chain?: string;
  timestamp: number;
}

const records: CallRecord[] = [];
let epoch = Date.now();

export function record(entry: Omit<CallRecord, 'timestamp'>): void {
  records.push({ ...entry, timestamp: Date.now() });
}

export function count(): number {
  return records.length;
}

export function all(): CallRecord[] {
  return [...records];
}

export function reset(): void {
  records.length = 0;
  epoch = Date.now();
}

export function uptime(): number {
  return Math.floor((Date.now() - epoch) / 1000);
}

export function classifyRole(cmd: string): string {
  const map: [RegExp, string][] = [
    [/netflow|smart-money:netflow/i, 'Smart Money Netflow'],
    [/dex-trades|smart-money:dex-trades/i, 'Smart Money DEX Trades'],
    [/perp-trades/i, 'Smart Money Perp Trades'],
    [/holdings/i, 'Smart Money Holdings'],
    [/dcas/i, 'Smart Money DCAs'],
    [/historical-holdings/i, 'Smart Money Historical Holdings'],
    [/profiler|arkham/i, 'Wallet Profiler'],
    [/token\s*info|token\s*metadata/i, 'Token Info'],
    [/screener|token\s*screener/i, 'Token Screener'],
    [/flow-intelligence|token\s*flows/i, 'Token Flows'],
    [/token\s*holders/i, 'Token Holders'],
    [/who-bought-sold/i, 'Buy/Sell Analysis'],
    [/indicators|token\s*indicators/i, 'Token Indicators'],
    [/ohlcv|price\s*data/i, 'Price Data'],
    [/trade\s*quote|jupiter.*quote/i, 'Trade Quote'],
    [/trade\s*execute|jupiter.*swap/i, 'Trade Execution'],
    [/account/i, 'Account'],
    [/alerts/i, 'Alerts'],
    [/related-wallets|related/i, 'Related Wallets'],
    [/trace/i, 'Wallet Trace'],
    [/compare/i, 'Wallet Compare'],
    [/transactions/i, 'Transactions'],
    [/historical-balances/i, 'Historical Balances'],
    [/search|token\s*search/i, 'Search'],
    [/perp\s*screener|hyperliquid:meta/i, 'Perp Screener'],
    [/perp\s*leaderboard|hyperliquid:openInterest/i, 'Perp Leaderboard'],
    [/perp-positions|hyperliquid.*perp/i, 'Perp Positions'],
    [/jup-dca/i, 'Jupiter DCA'],
    [/portfolio/i, 'DeFi Portfolio'],
    [/agent/i, 'AI Agent'],
    [/prediction-market/i, 'Prediction Market'],
    [/wallet/i, 'Wallet'],
    [/moralis/i, 'Moralis API'],
    [/dexscreener/i, 'DexScreener API'],
  ];

  for (const [pattern, label] of map) {
    if (pattern.test(cmd)) return label;
  }
  return 'Other';
}

export interface TelemetrySummary {
  totalCalls: number;
  byRole: Record<string, number>;
  byChain: Record<string, number>;
  avgLatencyMs: number;
  cacheHitRate: number;
  uptimeSeconds: number;
}

export function summary(): TelemetrySummary {
  const byRole: Record<string, number> = {};
  const byChain: Record<string, number> = {};
  let totalLatency = 0;
  let hits = 0;
  let misses = 0;

  for (const rec of records) {
    byRole[rec.role] = (byRole[rec.role] || 0) + 1;
    if (rec.chain) {
      byChain[rec.chain] = (byChain[rec.chain] || 0) + 1;
    }
    totalLatency += rec.latencyMs;
    if (rec.cacheStatus === 'HIT') hits++;
    if (rec.cacheStatus === 'MISS') misses++;
  }

  const total = hits + misses;
  return {
    totalCalls: records.length,
    byRole,
    byChain,
    avgLatencyMs: records.length > 0 ? Math.round(totalLatency / records.length) : 0,
    cacheHitRate: total > 0 ? Math.round((hits / total) * 100) : 0,
    uptimeSeconds: uptime(),
  };
}
