import { record, classifyRole } from '../telemetry.js';
import { TTLCache } from '../cache.js';
import type { Chain, ProviderResult } from './types.js';

const BASE = 'https://deep-index.moralis.io/api/v2.2';
const cache = new TTLCache<string>(120_000);

const CHAIN_MAP: Partial<Record<Chain, string>> = {
  ethereum: '0x1',
  base: '0x2105',
  bnb: '0x38',
};

function getApiKey(): string {
  const key = process.env.MORALIS_API_KEY;
  if (!key) throw new Error('MORALIS_API_KEY not set. Get a free key at https://admin.moralis.io');
  return key;
}

async function apiGet(path: string, role: string, chain?: string): Promise<any> {
  const cached = cache.get(path);
  if (cached !== undefined) {
    record({ endpoint: path, method: 'EXEC', latencyMs: 0, status: 'CACHED', cacheStatus: 'HIT', role, chain });
    return cached;
  }
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'X-API-Key': getApiKey(), Accept: 'application/json' },
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

export async function fetchTokenHolders(chain: Chain, token: string, limit: number): Promise<ProviderResult> {
  const mc = CHAIN_MAP[chain];
  if (!mc) return { ok: false, error: `Moralis: unsupported chain ${chain}`, code: 'UNSUPPORTED' };
  const data = await apiGet(`erc20/${token}/owners?chain=${mc}&limit=${limit}`, 'Token Holders', chain);
  if (!data?.result) return { ok: false, error: 'No holder data', code: 'NO_DATA' };
  const mapped = (data.result as any[]).map((h: any) => ({
    owner_address: h.owner_of,
    address: h.owner_of,
    wallet_address: h.owner_of,
    balance: h.balance,
    percentage_relative_to_total_supply: h.percentage_relative_to_total_supply,
  }));
  return { ok: true, data: { data: mapped } };
}

export async function fetchWalletTokens(address: string, chain: Chain): Promise<ProviderResult> {
  const mc = CHAIN_MAP[chain];
  if (!mc) return { ok: false, error: `Moralis: unsupported chain ${chain}`, code: 'UNSUPPORTED' };
  const data = await apiGet(`/${address}/erc20?chain=${mc}`, 'Wallet Tokens', chain);
  if (!data) return { ok: false, error: 'No wallet data', code: 'NO_DATA' };
  return { ok: true, data: { data } };
}

export async function fetchWalletTransactions(address: string, chain: Chain, limit: number): Promise<ProviderResult> {
  const mc = CHAIN_MAP[chain];
  if (!mc) return { ok: false, error: `Moralis: unsupported chain ${chain}`, code: 'UNSUPPORTED' };
  const data = await apiGet(`/${address}?chain=${mc}&limit=${limit}`, 'Wallet Transactions', chain);
  if (!data?.result) return { ok: false, error: 'No transaction data', code: 'NO_DATA' };
  return { ok: true, data: { data: data.result } };
}

export async function fetchTokenMetadata(token: string, chain: Chain): Promise<ProviderResult> {
  const mc = CHAIN_MAP[chain];
  if (!mc) return { ok: false, error: `Moralis: unsupported chain ${chain}`, code: 'UNSUPPORTED' };
  const data = await apiGet(`erc20/metadata?addresses=${token}&chain=${mc}`, 'Token Metadata', chain);
  if (!data) return { ok: false, error: 'No metadata', code: 'NO_DATA' };
  return { ok: true, data: { data: Array.isArray(data) ? data[0] : data } };
}
