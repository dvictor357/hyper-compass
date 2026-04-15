import { CHAINS, type Chain } from './providers/types.js';
import { provider } from './providers/index.js';

export interface ChainScan {
  chain: Chain;
  netflow: any[];
  dexTrades: any[];
  topTokens: any[];
  scannedAt: number;
}

export interface TokenAccumulation {
  address: string;
  symbol: string;
  chains: Chain[];
  totalNetflow: number;
  totalBuyVolume: number;
  smartMoneyBuyers: number;
  firstSeenAt: number;
}

export async function scanChain(chain: Chain): Promise<ChainScan> {
  const p = provider();
  const [netflowRes, dexRes, screenerRes] = await Promise.allSettled([
    p.fetchNetflow(chain, 20),
    p.fetchDexTrades(chain, 20),
    p.fetchTokenScreener(chain, '24h', 20),
  ]);

  const extract = <T>(r: PromiseSettledResult<any>): T[] =>
    r.status === 'fulfilled' && r.value?.ok
      ? (r.value.data?.data as T[] ?? [])
      : [];

  return {
    chain,
    netflow: extract(netflowRes),
    dexTrades: extract(dexRes),
    topTokens: extract(screenerRes),
    scannedAt: Date.now(),
  };
}

export async function scanAll(chains?: Chain[]): Promise<ChainScan[]> {
  const targets = chains ?? [...CHAINS];
  const BATCH = 4;
  const out: ChainScan[] = [];

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(scanChain));
    for (const r of results) {
      if (r.status === 'fulfilled') out.push(r.value);
    }
  }

  return out;
}

export function findAccumulations(scans: ChainScan[]): TokenAccumulation[] {
  const map = new Map<string, TokenAccumulation>();

  for (const scan of scans) {
    for (const item of scan.netflow) {
      const sym = (item.symbol || item.token_symbol || 'UNKNOWN').toUpperCase();
      const addr = item.address || item.token_address || sym;

      if (!map.has(sym)) {
        map.set(sym, { address: addr, symbol: sym, chains: [], totalNetflow: 0, totalBuyVolume: 0, smartMoneyBuyers: 0, firstSeenAt: Date.now() });
      }

      const entry = map.get(sym)!;
      if (!entry.chains.includes(scan.chain)) entry.chains.push(scan.chain);

      const raw24h = parseFloat(item.net_flow_24h_usd ?? item.netFlow24h ?? 0);
      const raw7d = parseFloat(item.net_flow_7d_usd ?? item.netFlow7d ?? 0);
      const raw30d = parseFloat(item.net_flow_30d_usd ?? item.netFlow30d ?? 0);
      const flow = raw24h !== 0 ? raw24h : raw7d !== 0 ? raw7d : raw30d;
      entry.totalNetflow += flow;
      entry.smartMoneyBuyers += parseInt(item.trader_count ?? item.traderCount ?? 1, 10);
    }

    for (const trade of scan.dexTrades) {
      const sym = (trade.token_bought_symbol || trade.boughtSymbol || trade.symbol || 'UNKNOWN').toUpperCase();
      const addr = trade.token_bought_address || trade.boughtAddress || sym;

      if (!map.has(sym)) {
        map.set(sym, { address: addr, symbol: sym, chains: [], totalNetflow: 0, totalBuyVolume: 0, smartMoneyBuyers: 0, firstSeenAt: Date.now() });
      }

      const entry = map.get(sym)!;
      if (!entry.chains.includes(scan.chain)) entry.chains.push(scan.chain);

      const vol = parseFloat(trade.trade_value_usd ?? trade.valueUsd ?? trade.value_usd ?? 0);
      entry.totalBuyVolume += vol;
      entry.smartMoneyBuyers += 1;
    }
  }

  return Array.from(map.values())
    .filter(t => t.totalNetflow !== 0 || t.totalBuyVolume > 0)
    .sort((a, b) => {
      if (b.chains.length !== a.chains.length) return b.chains.length - a.chains.length;
      return Math.abs(b.totalNetflow) - Math.abs(a.totalNetflow);
    });
}
