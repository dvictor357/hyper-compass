import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  record,
  count,
  all,
  reset,
  uptime,
  classifyRole,
  summary,
} from '../lib/telemetry.ts';
import type { CallRecord } from '../lib/telemetry.ts';

describe('Telemetry', () => {
  beforeEach(() => {
    reset();
  });

  it('records a call and increments count', () => {
    record({
      endpoint: 'netflow ethereum',
      method: 'EXEC',
      latencyMs: 120,
      status: 'ok',
      cacheStatus: 'MISS',
      role: 'Smart Money Netflow',
    });
    expect(count()).toBe(1);
  });

  it('returns all recorded entries', () => {
    record({
      endpoint: 'dex-trades solana',
      method: 'EXEC',
      latencyMs: 50,
      status: 'ok',
      cacheStatus: 'HIT',
      role: 'Smart Money DEX Trades',
      chain: 'solana',
    });
    record({
      endpoint: 'holdings base',
      method: 'EXEC',
      latencyMs: 200,
      status: 'ok',
      cacheStatus: 'MISS',
      role: 'Smart Money Holdings',
      chain: 'base',
    });

    const entries = all();
    expect(entries).toHaveLength(2);
    expect(entries[0].endpoint).toBe('dex-trades solana');
    expect(entries[1].chain).toBe('base');
    expect(entries[0].timestamp).toBeGreaterThan(0);
  });

  it('resets all state', () => {
    record({
      endpoint: 'test',
      method: 'EXEC',
      latencyMs: 10,
      status: 'ok',
      cacheStatus: 'N/A',
      role: 'Test',
    });
    expect(count()).toBe(1);
    reset();
    expect(count()).toBe(0);
    expect(all()).toHaveLength(0);
  });

  it('reports uptime in seconds', () => {
    vi.useFakeTimers();
    reset();
    vi.advanceTimersByTime(45000);
    expect(uptime()).toBe(45);
    vi.useRealTimers();
  });

  describe('classifyRole', () => {
    it('classifies netflow commands', () => {
      expect(classifyRole('nansen netflow ethereum')).toBe('Smart Money Netflow');
    });

    it('classifies dex-trades commands', () => {
      expect(classifyRole('nansen dex-trades solana')).toBe('Smart Money DEX Trades');
    });

    it('classifies profiler commands', () => {
      expect(classifyRole('nansen profiler wallet123')).toBe('Wallet Profiler');
    });

    it('classifies token info commands', () => {
      expect(classifyRole('nansen token info TOKEN123')).toBe('Token Info');
    });

    it('returns Other for unknown commands', () => {
      expect(classifyRole('nansen unknown-command')).toBe('Other');
    });

    it('classifies perp-trades', () => {
      expect(classifyRole('nansen perp-trades btc')).toBe('Smart Money Perp Trades');
    });

    it('classifies prediction-market', () => {
      expect(classifyRole('nansen prediction-market')).toBe('Prediction Market');
    });
  });

  describe('summary', () => {
    it('returns empty summary when no calls recorded', () => {
      const s = summary();
      expect(s.totalCalls).toBe(0);
      expect(s.avgLatencyMs).toBe(0);
      expect(s.cacheHitRate).toBe(0);
      expect(s.byRole).toEqual({});
      expect(s.byChain).toEqual({});
    });

    it('computes correct summary statistics', () => {
      record({
        endpoint: 'netflow eth',
        method: 'EXEC',
        latencyMs: 100,
        status: 'ok',
        cacheStatus: 'HIT',
        role: 'Smart Money Netflow',
        chain: 'ethereum',
      });
      record({
        endpoint: 'netflow sol',
        method: 'EXEC',
        latencyMs: 200,
        status: 'ok',
        cacheStatus: 'MISS',
        role: 'Smart Money Netflow',
        chain: 'solana',
      });
      record({
        endpoint: 'dex-trades sol',
        method: 'EXEC',
        latencyMs: 300,
        status: 'ok',
        cacheStatus: 'MISS',
        role: 'Smart Money DEX Trades',
        chain: 'solana',
      });

      const s = summary();
      expect(s.totalCalls).toBe(3);
      expect(s.avgLatencyMs).toBe(200);
      expect(s.cacheHitRate).toBe(33);
      expect(s.byRole['Smart Money Netflow']).toBe(2);
      expect(s.byRole['Smart Money DEX Trades']).toBe(1);
      expect(s.byChain['ethereum']).toBe(1);
      expect(s.byChain['solana']).toBe(2);
    });
  });
});
