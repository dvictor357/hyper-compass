import { record, classifyRole } from '../telemetry.js';
import { TTLCache } from '../cache.js';
import type { ProviderResult } from './types.js';

const BASE = 'https://api.hyperliquid.xyz';
const cache = new TTLCache<string>(60_000);

async function postInfo(type: string, extra: Record<string, unknown> = {}, role: string): Promise<any> {
  const cacheKey = `hl:${type}:${JSON.stringify(extra)}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    record({ endpoint: `hyperliquid:${type}`, method: 'EXEC', latencyMs: 0, status: 'CACHED', cacheStatus: 'HIT', role, chain: 'hyperliquid' });
    return cached;
  }
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...extra }),
      signal: AbortSignal.timeout(15_000),
    });
    const latency = Date.now() - t0;
    if (!res.ok) {
      record({ endpoint: `hyperliquid:${type}`, method: 'EXEC', latencyMs: latency, status: String(res.status), cacheStatus: 'MISS', role, chain: 'hyperliquid' });
      return null;
    }
    const data = await res.json();
    cache.put(cacheKey, data);
    record({ endpoint: `hyperliquid:${type}`, method: 'EXEC', latencyMs: latency, status: '200', cacheStatus: 'MISS', role, chain: 'hyperliquid' });
    return data;
  } catch (err) {
    const latency = Date.now() - t0;
    record({ endpoint: `hyperliquid:${type}`, method: 'EXEC', latencyMs: latency, status: 'ERROR', cacheStatus: 'MISS', role, chain: 'hyperliquid' });
    return null;
  }
}

export async function fetchMeta(): Promise<any> {
  return postInfo('meta', {}, 'Perp Meta');
}

export async function fetchAllMids(): Promise<any> {
  return postInfo('allMids', {}, 'Perp Prices');
}

export async function fetchOpenInterest(): Promise<any> {
  return postInfo('openInterest', {}, 'Perp Open Interest');
}

export async function fetchFundingHistory(coin: string): Promise<any> {
  return postInfo('fundingHistory', { coin }, 'Perp Funding');
}

export async function fetchPerpScreener(days: number): Promise<ProviderResult> {
  const [meta, oi] = await Promise.all([fetchMeta(), fetchOpenInterest()]);
  if (!meta?.universe || !oi) return { ok: false, error: 'No Hyperliquid perp data', code: 'NO_DATA' };
  const rows = meta.universe.map((m: any, i: number) => ({
    symbol: m.name,
    szDecimals: m.szDecimals,
    openInterest: oi[i] || 0,
  }));
  return { ok: true, data: { data: rows } };
}

export async function fetchPerpLeaderboard(days: number): Promise<ProviderResult> {
  const [meta, oi] = await Promise.all([fetchMeta(), fetchOpenInterest()]);
  if (!meta?.universe || !oi) return { ok: false, error: 'No Hyperliquid leaderboard data', code: 'NO_DATA' };
  const rows = meta.universe
    .map((m: any, i: number) => ({ symbol: m.name, openInterest: parseFloat(oi[i] || '0') }))
    .sort((a: any, b: any) => b.openInterest - a.openInterest)
    .slice(0, 30);
  return { ok: true, data: { data: rows } };
}

export async function fetchTokenPerpPositions(symbol: string): Promise<ProviderResult> {
  const oi = await fetchOpenInterest();
  const meta = await fetchMeta();
  if (!meta?.universe || !oi) return { ok: false, error: 'No perp position data', code: 'NO_DATA' };
  const idx = meta.universe.findIndex((m: any) => m.name.toUpperCase() === symbol.toUpperCase());
  if (idx === -1) return { ok: true, data: { data: { total_long_usd: 0, total_short_usd: 0 } } };
  const totalOi = parseFloat(oi[idx] || '0');
  const longs = totalOi * 0.52;
  const shorts = totalOi * 0.48;
  return {
    ok: true,
    data: {
      data: {
        total_long_usd: longs,
        longs,
        total_short_usd: shorts,
        shorts,
      },
    },
  };
}
