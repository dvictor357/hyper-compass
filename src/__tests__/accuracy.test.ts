import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
const FILE = join(DIR, 'signals.json');
const BAK = FILE + '.bak';

beforeEach(() => {
  if (existsSync(FILE)) writeFileSync(BAK, readFileSync(FILE, 'utf-8'), 'utf-8');
  if (existsSync(FILE)) unlinkSync(FILE);
});

afterEach(() => {
  if (existsSync(FILE)) unlinkSync(FILE);
  if (existsSync(BAK)) {
    writeFileSync(FILE, readFileSync(BAK, 'utf-8'), 'utf-8');
    unlinkSync(BAK);
  }
});

async function load() { return import('../lib/accuracy.js'); }

describe('accuracy', () => {
  describe('record', () => {
    it('creates signal with generated id', async () => {
      const { record } = await load();
      const r = record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 85, priceAtSignal: 3200 });
      expect(r.id).toMatch(/^sig-/);
      expect(r.token).toBe('ETH');
      expect(r.outcome).toBe('pending');
    });

    it('persists to file', async () => {
      const { record } = await load();
      record({ timestamp: Date.now(), type: 'syndicate', token: 'LINK', direction: 'bullish', conviction: 72, priceAtSignal: 17.50 });
      const data = JSON.parse(readFileSync(FILE, 'utf-8'));
      expect(data).toHaveLength(1);
    });

    it('appends without overwriting', async () => {
      const { record } = await load();
      record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 80, priceAtSignal: 3100 });
      record({ timestamp: Date.now(), type: 'syndicate', token: 'SOL', direction: 'bullish', conviction: 70, priceAtSignal: 140 });
      expect(JSON.parse(readFileSync(FILE, 'utf-8'))).toHaveLength(2);
    });

    it('generates unique ids', async () => {
      const { record } = await load();
      const a = record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 80, priceAtSignal: 3100 });
      const b = record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 80, priceAtSignal: 3100 });
      expect(a.id).not.toBe(b.id);
    });

    it('respects provided outcome', async () => {
      const { record } = await load();
      const r = record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 90, priceAtSignal: 3200, outcome: 'correct', price24h: 3300 });
      expect(r.outcome).toBe('correct');
    });
  });

  describe('resolve', () => {
    it('marks bullish correct when price rises', async () => {
      const { record, resolve } = await load();
      const s = record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 85, priceAtSignal: 3200 });
      const r = resolve(s.id, { price24h: 3350 });
      expect(r.price24h).toBe(3350);
      expect(r.outcome).toBe('correct');
    });

    it('marks bullish incorrect when price drops', async () => {
      const { record, resolve } = await load();
      const s = record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 85, priceAtSignal: 3200 });
      expect(resolve(s.id, { price24h: 3100 }).outcome).toBe('incorrect');
    });

    it('marks bearish correct when price drops', async () => {
      const { record, resolve } = await load();
      const s = record({ timestamp: Date.now(), type: 'divergence', token: 'BNB', direction: 'bearish', conviction: 60, priceAtSignal: 580 });
      expect(resolve(s.id, { price24h: 570 }).outcome).toBe('correct');
    });

    it('marks bearish incorrect when price rises', async () => {
      const { record, resolve } = await load();
      const s = record({ timestamp: Date.now(), type: 'divergence', token: 'BNB', direction: 'bearish', conviction: 60, priceAtSignal: 580 });
      expect(resolve(s.id, { price24h: 600 }).outcome).toBe('incorrect');
    });

    it('updates multiple timeframes', async () => {
      const { record, resolve } = await load();
      const s = record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 85, priceAtSignal: 3200 });
      const r = resolve(s.id, { price24h: 3300, price48h: 3400, price7d: 3500 });
      expect(r.price24h).toBe(3300);
      expect(r.price48h).toBe(3400);
      expect(r.price7d).toBe(3500);
    });

    it('throws for missing id', async () => {
      const { resolve } = await load();
      expect(() => resolve('nope', { price24h: 100 })).toThrow('not found');
    });

    it('persists resolution', async () => {
      const { record, resolve } = await load();
      const s = record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 85, priceAtSignal: 3200 });
      resolve(s.id, { price24h: 3350 });
      const data = JSON.parse(readFileSync(FILE, 'utf-8'));
      expect(data[0].outcome).toBe('correct');
    });
  });

  describe('report', () => {
    it('empty report', async () => {
      const { report } = await load();
      const r = report();
      expect(r.totalSignals).toBe(0);
      expect(r.accuracyRate).toBe(0);
    });

    it('100% when all correct', async () => {
      const { record, resolve, report } = await load();
      const s1 = record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 85, priceAtSignal: 3200 });
      const s2 = record({ timestamp: Date.now(), type: 'syndicate', token: 'SOL', direction: 'bullish', conviction: 75, priceAtSignal: 140 });
      resolve(s1.id, { price24h: 3400 });
      resolve(s2.id, { price24h: 150 });
      const r = report();
      expect(r.resolvedSignals).toBe(2);
      expect(r.accuracyRate).toBe(100);
    });

    it('50% with mixed', async () => {
      const { record, resolve, report } = await load();
      const s1 = record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 85, priceAtSignal: 3200 });
      const s2 = record({ timestamp: Date.now(), type: 'syndicate', token: 'SOL', direction: 'bullish', conviction: 75, priceAtSignal: 140 });
      resolve(s1.id, { price24h: 3400 });
      resolve(s2.id, { price24h: 130 });
      const r = report();
      expect(r.accuracyRate).toBe(50);
    });

    it('excludes pending from rate', async () => {
      const { record, resolve, report } = await load();
      const s1 = record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 85, priceAtSignal: 3200 });
      record({ timestamp: Date.now(), type: 'syndicate', token: 'SOL', direction: 'bullish', conviction: 75, priceAtSignal: 140 });
      resolve(s1.id, { price24h: 3400 });
      const r = report();
      expect(r.totalSignals).toBe(2);
      expect(r.resolvedSignals).toBe(1);
      expect(r.accuracyRate).toBe(100);
    });

    it('avgReturn24h', async () => {
      const { record, resolve, report } = await load();
      const s1 = record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 85, priceAtSignal: 3200 });
      const s2 = record({ timestamp: Date.now(), type: 'syndicate', token: 'SOL', direction: 'bullish', conviction: 75, priceAtSignal: 140 });
      resolve(s1.id, { price24h: 3400 });
      resolve(s2.id, { price24h: 150 });
      const r = report();
      expect(r.avgReturn24h).toBeGreaterThan(6);
      expect(r.avgReturn24h).toBeLessThan(8);
    });

    it('by type breakdown', async () => {
      const { record, resolve, report } = await load();
      const s1 = record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 85, priceAtSignal: 3200 });
      const s2 = record({ timestamp: Date.now(), type: 'syndicate', token: 'SOL', direction: 'bullish', conviction: 75, priceAtSignal: 140 });
      const s3 = record({ timestamp: Date.now(), type: 'divergence', token: 'BNB', direction: 'bearish', conviction: 60, priceAtSignal: 580 });
      resolve(s1.id, { price24h: 3400 });
      resolve(s2.id, { price24h: 130 });
      resolve(s3.id, { price24h: 570 });
      const r = report();
      expect(r.byType.convergence.rate).toBe(100);
      expect(r.byType.syndicate.rate).toBe(0);
      expect(r.byType.divergence.rate).toBe(100);
    });
  });

  describe('all', () => {
    it('returns all signals', async () => {
      const { record, all } = await load();
      record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 85, priceAtSignal: 3200 });
      record({ timestamp: Date.now(), type: 'syndicate', token: 'SOL', direction: 'bullish', conviction: 75, priceAtSignal: 140 });
      expect(all()).toHaveLength(2);
    });
  });

  describe('seed', () => {
    it('populates 20 mock signals', async () => {
      const { seed, all } = await load();
      seed();
      expect(all()).toHaveLength(20);
    });

    it('does not overwrite existing', async () => {
      const { record, seed, all } = await load();
      record({ timestamp: Date.now(), type: 'convergence', token: 'ETH', direction: 'bullish', conviction: 85, priceAtSignal: 3200 });
      seed();
      expect(all()).toHaveLength(1);
    });

    it('produces ~65% accuracy', async () => {
      const { seed, report } = await load();
      seed();
      const r = report();
      expect(r.accuracyRate).toBeGreaterThanOrEqual(55);
      expect(r.accuracyRate).toBeLessThanOrEqual(75);
    });
  });
});
