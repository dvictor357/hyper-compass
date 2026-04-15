import { record, classifyRole } from '../telemetry.js';
import { TTLCache } from '../cache.js';
import type { ProviderResult } from './types.js';

const QUOTE_API = 'https://quote-api.jup.ag/v6';
const cache = new TTLCache<string>(30_000);

const WRAPPED_SOL = 'So11111111111111111111111111111111111111112';
const USDC_SOL = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

async function apiGet(path: string, role: string, chain?: string): Promise<any> {
  const cached = cache.get(path);
  if (cached !== undefined) {
    record({ endpoint: path, method: 'EXEC', latencyMs: 0, status: 'CACHED', cacheStatus: 'HIT', role, chain });
    return cached;
  }
  const t0 = Date.now();
  try {
    const res = await fetch(`${QUOTE_API}${path}`, {
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

export async function fetchQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps = 50,
): Promise<ProviderResult> {
  const path = `/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
  const data = await apiGet(path, 'Trade Quote', 'solana');
  if (!data) return { ok: false, error: 'Jupiter quote failed', code: 'QUOTE_ERROR' };
  return {
    ok: true,
    data: {
      data: {
        quoteId: data.quoteId || data.id || 'jup-quote',
        quote_id: data.quoteId || data.id || 'jup-quote',
        inputMint: data.inputMint,
        outputMint: data.outputMint,
        inAmount: data.inAmount,
        outAmount: data.outAmount,
        price: data.outAmount ? (Number(data.outAmount) / Number(data.inAmount || 1)).toString() : '0',
        priceImpact: data.priceImpactPct || '0',
        route: data.routePlan?.map((r: any) => r.swapInfo?.label || 'Jupiter').join(' → ') || 'Jupiter',
      },
    },
  };
}

export async function fetchSwapTransaction(quoteResponse: any): Promise<ProviderResult> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${QUOTE_API}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: process.env.SOLANA_WALLET || WRAPPED_SOL,
        wrapAndUnwrapSol: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const latency = Date.now() - t0;
    if (!res.ok) {
      record({ endpoint: 'jupiter:swap', method: 'EXEC', latencyMs: latency, status: String(res.status), cacheStatus: 'MISS', role: 'Trade Execution', chain: 'solana' });
      return { ok: false, error: 'Jupiter swap failed', code: 'SWAP_ERROR' };
    }
    const data = await res.json();
    record({ endpoint: 'jupiter:swap', method: 'EXEC', latencyMs: latency, status: '200', cacheStatus: 'MISS', role: 'Trade Execution', chain: 'solana' });
    return { ok: true, data: { data } };
  } catch (err) {
    const latency = Date.now() - t0;
    record({ endpoint: 'jupiter:swap', method: 'EXEC', latencyMs: latency, status: 'ERROR', cacheStatus: 'MISS', role: 'Trade Execution', chain: 'solana' });
    return { ok: false, error: String(err), code: 'SWAP_ERROR' };
  }
}
