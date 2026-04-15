import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AlphaSignal } from './signal-engine.js';
import { provider } from './providers/index.js';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
const FILE = join(DIR, 'signal-history.json');

export interface TrackedSignal extends AlphaSignal {
  priceAtDetection?: number;
  priceAfter24h?: number;
  priceAfter72h?: number;
  priceAfter7d?: number;
  returnPct24h?: number;
  returnPct72h?: number;
  returnPct7d?: number;
  outcome?: 'WIN' | 'LOSS' | 'PENDING';
  checkedAt?: number;
}

export interface Stats {
  totalSignals: number;
  resolved: number;
  pending: number;
  wins: number;
  losses: number;
  winRate: number;
  avgReturn24h: number;
  avgReturn72h: number;
  strongBuyWinRate: number;
  buyWinRate: number;
}

let history: TrackedSignal[] = [];

export async function loadHistory(): Promise<void> {
  try {
    history = JSON.parse(await readFile(FILE, 'utf-8'));
  } catch {
    history = [];
  }
}

export async function saveHistory(): Promise<void> {
  await mkdir(DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(history, null, 2));
}

export async function trackSignal(signal: AlphaSignal): Promise<TrackedSignal> {
  const tracked: TrackedSignal = { ...signal, outcome: 'PENDING' };

  try {
    const chain = signal.chains[0] || 'ethereum';
    const res = await provider().fetchTokenInfo(chain as any, signal.symbol);
    if (res.ok && res.data?.data) {
      const d = res.data.data as any;
      tracked.priceAtDetection = parseFloat(d.price_usd || d.price || '0');
    }
  } catch {}

  history.push(tracked);
  await saveHistory();
  return tracked;
}

async function fetchCurrentPrice(signal: TrackedSignal): Promise<number | undefined> {
  try {
    const chain = signal.chains[0] || 'ethereum';
    const res = await provider().fetchTokenInfo(chain as any, signal.symbol);
    if (res.ok && res.data?.data) {
      const d = res.data.data as any;
      return parseFloat(d.price_usd || d.price || '0');
    }
  } catch {}
  return undefined;
}

export async function checkPerformance(): Promise<number> {
  let updated = 0;
  const now = Date.now();

  for (const sig of history) {
    if (sig.outcome !== 'PENDING' || !sig.priceAtDetection) continue;

    const ageHours = (now - sig.detectedAt) / (1000 * 60 * 60);

    if (ageHours >= 24 && sig.priceAfter24h === undefined) {
      const price = await fetchCurrentPrice(sig);
      if (price !== undefined) {
        sig.priceAfter24h = price;
        sig.returnPct24h = ((price - sig.priceAtDetection) / sig.priceAtDetection) * 100;
        sig.checkedAt = now;
        updated++;
      }
    }

    if (ageHours >= 72 && sig.priceAfter72h === undefined) {
      const price = await fetchCurrentPrice(sig);
      if (price !== undefined) {
        sig.priceAfter72h = price;
        sig.returnPct72h = ((price - sig.priceAtDetection) / sig.priceAtDetection) * 100;
        sig.checkedAt = now;
        updated++;
      }
    }

    if (sig.returnPct72h !== undefined && sig.outcome === 'PENDING') {
      sig.outcome = sig.returnPct72h > 0 ? 'WIN' : 'LOSS';
      updated++;
    }
  }

  if (updated > 0) await saveHistory();
  return updated;
}

export function getStats(): Stats {
  const resolved = history.filter(s => s.outcome !== 'PENDING');
  const pending = history.filter(s => s.outcome === 'PENDING');
  const wins = resolved.filter(s => s.outcome === 'WIN');

  const strongBuy = resolved.filter(s => s.classification === 'STRONG_BUY');
  const buy = resolved.filter(s => s.classification === 'BUY');

  const ret24 = resolved.filter(s => s.returnPct24h !== undefined).map(s => s.returnPct24h!);
  const ret72 = resolved.filter(s => s.returnPct72h !== undefined).map(s => s.returnPct72h!);

  return {
    totalSignals: history.length,
    resolved: resolved.length,
    pending: pending.length,
    wins: wins.length,
    losses: resolved.length - wins.length,
    winRate: resolved.length > 0 ? Math.round((wins.length / resolved.length) * 100) : 0,
    avgReturn24h: ret24.length > 0 ? Number((ret24.reduce((a, b) => a + b, 0) / ret24.length).toFixed(2)) : 0,
    avgReturn72h: ret72.length > 0 ? Number((ret72.reduce((a, b) => a + b, 0) / ret72.length).toFixed(2)) : 0,
    strongBuyWinRate: strongBuy.length > 0 ? Math.round((strongBuy.filter(s => s.outcome === 'WIN').length / strongBuy.length) * 100) : 0,
    buyWinRate: buy.length > 0 ? Math.round((buy.filter(s => s.outcome === 'WIN').length / buy.length) * 100) : 0,
  };
}

export function getHistory(): TrackedSignal[] {
  return [...history];
}

export function getRecent(hours = 24): TrackedSignal[] {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return history.filter(s => s.detectedAt >= cutoff);
}
