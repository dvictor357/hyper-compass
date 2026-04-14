import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
const FILE = join(DIR, 'signals.json');

export interface SignalRecord {
  id: string;
  timestamp: number;
  type: 'syndicate' | 'convergence' | 'divergence';
  token: string;
  direction: 'bullish' | 'bearish';
  conviction: number;
  priceAtSignal: number;
  price24h?: number;
  price48h?: number;
  price7d?: number;
  outcome?: 'correct' | 'incorrect' | 'pending';
}

export interface AccuracyReport {
  totalSignals: number;
  resolvedSignals: number;
  correct: number;
  incorrect: number;
  accuracyRate: number;
  avgReturn24h: number;
  avgReturn48h: number;
  byType: Record<string, { total: number; correct: number; rate: number }>;
}

function load(): SignalRecord[] {
  if (!existsSync(FILE)) return [];
  try {
    return JSON.parse(readFileSync(FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function save(signals: SignalRecord[]): void {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(signals, null, 2), 'utf-8');
}

export function record(sig: Omit<SignalRecord, 'id'>): SignalRecord {
  const signals = load();
  const entry: SignalRecord = {
    ...sig,
    id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    outcome: sig.outcome ?? 'pending',
  };
  signals.push(entry);
  save(signals);
  return entry;
}

export function resolve(
  id: string,
  prices: { price24h?: number; price48h?: number; price7d?: number },
): SignalRecord {
  const signals = load();
  const idx = signals.findIndex(s => s.id === id);
  if (idx === -1) throw new Error(`Signal ${id} not found`);

  const s = signals[idx];
  if (prices.price24h !== undefined) s.price24h = prices.price24h;
  if (prices.price48h !== undefined) s.price48h = prices.price48h;
  if (prices.price7d !== undefined) s.price7d = prices.price7d;

  const ref = s.price24h ?? s.price48h ?? s.price7d;
  if (ref !== undefined) {
    const change = ref - s.priceAtSignal;
    s.outcome = s.direction === 'bullish' ? (change > 0 ? 'correct' : 'incorrect') : (change < 0 ? 'correct' : 'incorrect');
  }

  signals[idx] = s;
  save(signals);
  return s;
}

export function report(): AccuracyReport {
  return compute(load());
}

export function all(): SignalRecord[] {
  return load();
}

function compute(signals: SignalRecord[]): AccuracyReport {
  const resolved = signals.filter(s => s.outcome === 'correct' || s.outcome === 'incorrect');
  const correct = resolved.filter(s => s.outcome === 'correct');

  let totalRet24 = 0, count24 = 0;
  let totalRet48 = 0, count48 = 0;

  for (const s of resolved) {
    if (s.price24h !== undefined) {
      const ret = ((s.price24h - s.priceAtSignal) / s.priceAtSignal) * 100;
      totalRet24 += s.direction === 'bearish' ? -ret : ret;
      count24++;
    }
    if (s.price48h !== undefined) {
      const ret = ((s.price48h - s.priceAtSignal) / s.priceAtSignal) * 100;
      totalRet48 += s.direction === 'bearish' ? -ret : ret;
      count48++;
    }
  }

  const byType: Record<string, { total: number; correct: number; rate: number }> = {};
  for (const type of ['syndicate', 'convergence', 'divergence'] as const) {
    const t = resolved.filter(s => s.type === type);
    const c = t.filter(s => s.outcome === 'correct');
    byType[type] = { total: t.length, correct: c.length, rate: t.length > 0 ? Math.round((c.length / t.length) * 100) : 0 };
  }

  return {
    totalSignals: signals.length,
    resolvedSignals: resolved.length,
    correct: correct.length,
    incorrect: resolved.length - correct.length,
    accuracyRate: resolved.length > 0 ? Math.round((correct.length / resolved.length) * 100) : 0,
    avgReturn24h: count24 > 0 ? Math.round((totalRet24 / count24) * 100) / 100 : 0,
    avgReturn48h: count48 > 0 ? Math.round((totalRet48 / count48) * 100) / 100 : 0,
    byType,
  };
}

export function seed(): void {
  if (load().length > 0) return;

  const now = Date.now();
  const D = 86400000;

  const mock: SignalRecord[] = [
    { id: 'sig-mock-001', timestamp: now - 14 * D, type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 88, priceAtSignal: 3180, price24h: 3295, price48h: 3340, price7d: 3520, outcome: 'correct' },
    { id: 'sig-mock-002', timestamp: now - 13 * D, type: 'syndicate', token: 'LINK', direction: 'bullish', conviction: 75, priceAtSignal: 16.80, price24h: 17.45, price48h: 17.90, price7d: 18.20, outcome: 'correct' },
    { id: 'sig-mock-003', timestamp: now - 12 * D, type: 'convergence', token: 'SOL', direction: 'bullish', conviction: 82, priceAtSignal: 142, price24h: 148, price48h: 151, price7d: 156, outcome: 'correct' },
    { id: 'sig-mock-004', timestamp: now - 11 * D, type: 'divergence', token: 'PEPE', direction: 'bullish', conviction: 62, priceAtSignal: 0.0000082, price24h: 0.0000078, price48h: 0.0000075, price7d: 0.0000071, outcome: 'incorrect' },
    { id: 'sig-mock-005', timestamp: now - 10 * D, type: 'convergence', token: 'ARB', direction: 'bullish', conviction: 71, priceAtSignal: 0.98, price24h: 1.02, price48h: 1.05, price7d: 1.08, outcome: 'correct' },
    { id: 'sig-mock-006', timestamp: now - 9 * D, type: 'syndicate', token: 'ETH', direction: 'bullish', conviction: 90, priceAtSignal: 3310, price24h: 3280, price48h: 3250, price7d: 3190, outcome: 'incorrect' },
    { id: 'sig-mock-007', timestamp: now - 8 * D, type: 'convergence', token: 'AVAX', direction: 'bullish', conviction: 65, priceAtSignal: 28.50, price24h: 29.10, price48h: 29.80, price7d: 30.40, outcome: 'correct' },
    { id: 'sig-mock-008', timestamp: now - 7 * D, type: 'divergence', token: 'BNB', direction: 'bearish', conviction: 58, priceAtSignal: 580, price24h: 575, price48h: 568, price7d: 560, outcome: 'correct' },
    { id: 'sig-mock-009', timestamp: now - 7 * D, type: 'convergence', token: 'LINK', direction: 'bullish', conviction: 79, priceAtSignal: 17.20, price24h: 17.85, price48h: 18.10, price7d: 18.45, outcome: 'correct' },
    { id: 'sig-mock-010', timestamp: now - 6 * D, type: 'syndicate', token: 'SOL', direction: 'bullish', conviction: 84, priceAtSignal: 149, price24h: 146, price48h: 143, price7d: 140, outcome: 'incorrect' },
    { id: 'sig-mock-011', timestamp: now - 5 * D, type: 'convergence', token: 'OP', direction: 'bullish', conviction: 68, priceAtSignal: 2.05, price24h: 2.12, price48h: 2.18, price7d: 2.25, outcome: 'correct' },
    { id: 'sig-mock-012', timestamp: now - 5 * D, type: 'divergence', token: 'PEPE', direction: 'bullish', conviction: 55, priceAtSignal: 0.0000075, price24h: 0.0000072, price48h: 0.0000079, price7d: 0.0000085, outcome: 'correct' },
    { id: 'sig-mock-013', timestamp: now - 4 * D, type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 92, priceAtSignal: 3350, price24h: 3420, price48h: 3480, price7d: 3550, outcome: 'correct' },
    { id: 'sig-mock-014', timestamp: now - 4 * D, type: 'syndicate', token: 'ARB', direction: 'bullish', conviction: 60, priceAtSignal: 1.05, price24h: 1.03, price48h: 1.01, price7d: 0.98, outcome: 'incorrect' },
    { id: 'sig-mock-015', timestamp: now - 3 * D, type: 'convergence', token: 'LINK', direction: 'bullish', conviction: 85, priceAtSignal: 18.10, price24h: 18.65, price48h: 19.00, price7d: 19.40, outcome: 'correct' },
    { id: 'sig-mock-016', timestamp: now - 3 * D, type: 'divergence', token: 'SOL', direction: 'bullish', conviction: 72, priceAtSignal: 152, price24h: 149, price48h: 147, price7d: 145, outcome: 'incorrect' },
    { id: 'sig-mock-017', timestamp: now - 2 * D, type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 86, priceAtSignal: 3420, price24h: 3490, price48h: 3520, outcome: 'correct' },
    { id: 'sig-mock-018', timestamp: now - 1 * D, type: 'syndicate', token: 'PEPE', direction: 'bullish', conviction: 70, priceAtSignal: 0.0000089, price24h: 0.0000092, outcome: 'pending' },
    { id: 'sig-mock-019', timestamp: now - 0.5 * D, type: 'convergence', token: 'LINK', direction: 'bullish', conviction: 78, priceAtSignal: 18.45, outcome: 'pending' },
    { id: 'sig-mock-020', timestamp: now - 0.25 * D, type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 91, priceAtSignal: 3490, outcome: 'pending' },
  ];

  save(mock);
}
