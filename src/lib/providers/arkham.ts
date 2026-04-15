import { record, classifyRole } from '../telemetry.js';
import { TTLCache } from '../cache.js';
import type { Chain, ProviderResult } from './types.js';

const BASE = 'https://api.arkhamintelligence.com';
const cache = new TTLCache<string>(300_000);

function getApiKey(): string | null {
  return process.env.ARKHAM_API_KEY || null;
}

async function apiGet(path: string, role: string, chain?: string): Promise<any> {
  const cached = cache.get(path);
  if (cached !== undefined) {
    record({ endpoint: path, method: 'EXEC', latencyMs: 0, status: 'CACHED', cacheStatus: 'HIT', role, chain });
    return cached;
  }
  const t0 = Date.now();
  const key = getApiKey();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (key) headers['Authorization'] = `Bearer ${key}`;

  try {
    const res = await fetch(`${BASE}${path}`, { headers, signal: AbortSignal.timeout(15_000) });
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

export async function fetchLabels(address: string, chain: Chain): Promise<ProviderResult> {
  const data = await apiGet(`/api/v1/entity/${address}`, 'Wallet Profiler', chain);
  if (!data) {
    return {
      ok: true,
      data: {
        data: {
          labels: ['Unlabeled'],
          firstSeen: new Date().toISOString(),
        },
      },
    };
  }
  const labels: string[] = [];
  if (data.name) labels.push(data.name);
  if (data.type) labels.push(data.type);
  if (data.labels && Array.isArray(data.labels)) {
    for (const l of data.labels) {
      if (typeof l === 'string') labels.push(l);
      else if (l?.label) labels.push(l.label);
      else if (l?.name) labels.push(l.name);
    }
  }
  return {
    ok: true,
    data: {
      data: {
        labels: labels.length > 0 ? labels : ['Unlabeled'],
        firstSeen: data.firstSeen || new Date().toISOString(),
      },
    },
  };
}

export async function fetchRelatedWallets(address: string, chain: Chain): Promise<ProviderResult> {
  const data = await apiGet(`/api/v1/entity/${address}/related`, 'Related Wallets', chain);
  if (!data || !Array.isArray(data)) {
    return { ok: true, data: { data: { related_wallets: [], wallets: [] } } };
  }
  const wallets = data.slice(0, 5).map((e: any) => ({
    address: e.address || e.entityId || '',
    wallet_address: e.address || e.entityId || '',
    label: e.name || e.type || '',
  }));
  return {
    ok: true,
    data: {
      data: {
        related_wallets: wallets,
        wallets,
      },
    },
  };
}
