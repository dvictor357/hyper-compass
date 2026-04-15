import { record, classifyRole } from '../telemetry.js';
import { TTLCache } from '../cache.js';
import type { Chain, ProviderResult } from './types.js';

const BASE = 'https://api.1inch.dev';
const VERSION = '6.0';
const cache = new TTLCache<string>(30_000);

const CHAIN_MAP: Partial<Record<Chain, string>> = {
  ethereum: '1',
  base: '8453',
  bnb: '56',
};

function getApiKey(): string | null {
  return process.env.ONEINCH_API_KEY || null;
}

async function apiGet(path: string, role: string, chain?: string): Promise<any> {
  const cached = cache.get(path);
  if (cached !== undefined) {
    record({ endpoint: path, method: 'EXEC', latencyMs: 0, status: 'CACHED', cacheStatus: 'HIT', role, chain });
    return cached;
  }
  const key = getApiKey();
  if (!key) return null;
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}/swap/${VERSION}${path}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
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

export async function fetchQuote(
  chain: Chain,
  from: string,
  to: string,
  amount: string,
): Promise<ProviderResult> {
  const cid = CHAIN_MAP[chain];
  if (!cid) return { ok: false, error: `1inch: unsupported chain ${chain}`, code: 'UNSUPPORTED' };
  const data = await apiGet(`/${cid}/quote?src=${from}&dst=${to}&amount=${amount}`, 'Trade Quote', chain);
  if (!data) return { ok: false, error: '1inch quote failed (check API key)', code: 'QUOTE_ERROR' };
  return {
    ok: true,
    data: {
      data: {
        quoteId: data.quoteId || '1inch-quote',
        quote_id: data.quoteId || '1inch-quote',
        fromToken: data.fromToken,
        toToken: data.toToken,
        fromAmount: data.fromAmount,
        toAmount: data.toAmount,
        price: data.toAmount && data.fromAmount ? (Number(data.toAmount) / Number(data.fromAmount)).toString() : '0',
        priceImpact: data.priceImpact?.toString() || '0',
        route: data.protocols?.map((p: any) => p[0]?.name || '1inch').join(' → ') || '1inch',
      },
    },
  };
}

export async function fetchSwap(
  chain: Chain,
  from: string,
  to: string,
  amount: string,
  fromAddress: string,
): Promise<ProviderResult> {
  const cid = CHAIN_MAP[chain];
  if (!cid) return { ok: false, error: `1inch: unsupported chain ${chain}`, code: 'UNSUPPORTED' };
  const t0 = Date.now();
  const key = getApiKey();
  if (!key) return { ok: false, error: 'ONEINCH_API_KEY not set', code: 'NO_KEY' };
  try {
    const res = await fetch(
      `${BASE}/swap/${VERSION}/${cid}/swap?src=${from}&dst=${to}&amount=${amount}&from=${fromAddress}&slippage=1`,
      { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) },
    );
    const latency = Date.now() - t0;
    if (!res.ok) {
      record({ endpoint: '1inch:swap', method: 'EXEC', latencyMs: latency, status: String(res.status), cacheStatus: 'MISS', role: 'Trade Execution', chain });
      return { ok: false, error: '1inch swap failed', code: 'SWAP_ERROR' };
    }
    const data = await res.json();
    record({ endpoint: '1inch:swap', method: 'EXEC', latencyMs: latency, status: '200', cacheStatus: 'MISS', role: 'Trade Execution', chain });
    return { ok: true, data: { data } };
  } catch (err) {
    const latency = Date.now() - t0;
    record({ endpoint: '1inch:swap', method: 'EXEC', latencyMs: latency, status: 'ERROR', cacheStatus: 'MISS', role: 'Trade Execution', chain });
    return { ok: false, error: String(err), code: 'SWAP_ERROR' };
  }
}
