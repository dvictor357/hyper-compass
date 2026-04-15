import { record, classifyRole } from '../telemetry.js';
import { TTLCache } from '../cache.js';
import type { Chain, ProviderResult } from './types.js';

const BASE = 'https://api.dexscreener.com';
const cache = new TTLCache<string>(60_000);

const CHAIN_MAP: Partial<Record<Chain, string>> = {
  ethereum: 'ethereum',
  solana: 'solana',
  base: 'base',
  bnb: 'bsc',
};

async function get(path: string, role: string, chain?: string): Promise<any> {
  const cached = cache.get(path);
  if (cached !== undefined) {
    record({ endpoint: path, method: 'EXEC', latencyMs: 0, status: 'CACHED', cacheStatus: 'HIT', role, chain });
    return cached;
  }
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    const latency = Date.now() - t0;
    if (!res.ok) {
      record({ endpoint: path, method: 'EXEC', latencyMs: latency, status: String(res.status), cacheStatus: 'MISS', role, chain });
      return null;
    }
    const data = await res.json();
    cache.put(path, data);
    record({ endpoint: path, method: 'EXEC', latencyMs: latency, status: '200', cacheStatus: 'MISS', role, chain });
    return data;
  } catch (err) {
    const latency = Date.now() - t0;
    record({ endpoint: path, method: 'EXEC', latencyMs: latency, status: 'ERROR', cacheStatus: 'MISS', role, chain });
    return null;
  }
}

function mapPairToScreener(pairs: any[]): any[] {
  return pairs.map(p => ({
    token_symbol: p.baseToken?.symbol || '',
    token_address: p.baseToken?.address || '',
    symbol: p.baseToken?.symbol || '',
    address: p.baseToken?.address || '',
    netflow: 0,
    volume: parseFloat(p.volume?.h24 || '0'),
    price_change: parseFloat(p.priceChange?.h24 || '0'),
    market_cap_usd: parseFloat(p.fdv || '0'),
    buy_volume: parseFloat(p.volume?.buy24h || '0'),
    sell_volume: parseFloat(p.volume?.sell24h || '0'),
    liquidity: parseFloat(p.liquidity?.usd || '0'),
    priceUsd: p.priceUsd || '0',
    pairAddress: p.pairAddress || '',
    dexId: p.dexId || '',
  }));
}

function mapPairToDexTrades(pairs: any[], chain: Chain): any[] {
  return pairs.slice(0, 20).map((p, i) => ({
    token_bought_symbol: p.baseToken?.symbol || '',
    boughtSymbol: p.baseToken?.symbol || '',
    symbol: p.baseToken?.symbol || '',
    token_bought_address: p.baseToken?.address || '',
    boughtAddress: p.baseToken?.address || '',
    trade_value_usd: parseFloat(p.volume?.h24 || '0') / Math.max(p.txns?.h24?.buys || 1, 1),
    value_usd: parseFloat(p.volume?.h24 || '0') / Math.max(p.txns?.h24?.buys || 1, 1),
    valueUsd: parseFloat(p.volume?.h24 || '0') / Math.max(p.txns?.h24?.buys || 1, 1),
    trader: p.pairAddress || '',
    chain,
    timestamp: new Date().toISOString(),
  }));
}

export async function fetchScreener(chain: Chain, timeframe: string, limit: number): Promise<ProviderResult> {
  const dc = CHAIN_MAP[chain];
  if (!dc) return { ok: false, error: `DexScreener: unsupported chain ${chain}`, code: 'UNSUPPORTED' };
  const data = await get(`/latest/dex/search?q=trending&chain=${dc}`, 'Token Screener', chain);
  if (!data?.pairs) return { ok: false, error: 'No data from DexScreener', code: 'NO_DATA' };
  const sorted = (data.pairs as any[])
    .filter((p: any) => p.chainId === dc)
    .sort((a: any, b: any) => parseFloat(b.volume?.h24 || '0') - parseFloat(a.volume?.h24 || '0'));
  return { ok: true, data: { data: mapPairToScreener(sorted.slice(0, limit)) } };
}

export async function fetchTokenByAddress(chain: Chain, token: string): Promise<ProviderResult> {
  const dc = CHAIN_MAP[chain];
  if (!dc) return { ok: false, error: `DexScreener: unsupported chain ${chain}`, code: 'UNSUPPORTED' };
  const data = await get(`/latest/dex/tokens/${token}`, 'Token Info', chain);
  if (!data?.pairs) return { ok: false, error: 'Token not found on DexScreener', code: 'NOT_FOUND' };
  const pair = data.pairs.find((p: any) => p.chainId === dc) || data.pairs[0];
  if (!pair) return { ok: false, error: 'No pair found', code: 'NOT_FOUND' };
  return {
    ok: true,
    data: {
      data: {
        symbol: pair.baseToken?.symbol || token,
        price_usd: pair.priceUsd || '0',
        price: pair.priceUsd || '0',
        marketCap: pair.fdv || '0',
        volume24h: pair.volume?.h24 || '0',
        liquidity: pair.liquidity?.usd || '0',
        change24h: pair.priceChange?.h24 || '0',
      },
    },
  };
}

export async function fetchDexTradesForChain(chain: Chain, limit: number): Promise<ProviderResult> {
  const dc = CHAIN_MAP[chain];
  if (!dc) return { ok: false, error: `DexScreener: unsupported chain ${chain}`, code: 'UNSUPPORTED' };
  const data = await get(`/latest/dex/search?q=trending&chain=${dc}`, 'Smart Money DEX Trades', chain);
  if (!data?.pairs) return { ok: false, error: 'No data from DexScreener', code: 'NO_DATA' };
  const pairs = (data.pairs as any[])
    .filter((p: any) => p.chainId === dc)
    .sort((a: any, b: any) => parseFloat(b.volume?.h24 || '0') - parseFloat(a.volume?.h24 || '0'));
  return { ok: true, data: { data: mapPairToDexTrades(pairs, chain).slice(0, limit) } };
}

export async function searchPairs(query: string): Promise<ProviderResult> {
  const data = await get(`/latest/dex/search?q=${encodeURIComponent(query)}`, 'Token Search');
  if (!data?.pairs) return { ok: false, error: 'No results', code: 'NO_DATA' };
  return { ok: true, data: { data: mapPairToScreener(data.pairs) } };
}
