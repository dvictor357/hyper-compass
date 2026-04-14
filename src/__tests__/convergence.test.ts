import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectConvergence, formatForAI } from '../lib/convergence.js';
import type { TokenAccumulation } from '../lib/scanner.js';

function acc(overrides: Partial<TokenAccumulation> = {}): TokenAccumulation {
  return {
    address: '0xeth',
    symbol: 'ETH',
    chains: ['ethereum', 'base'],
    totalNetflow: 1_200_000,
    totalBuyVolume: 500_000,
    smartMoneyBuyers: 6,
    firstSeenAt: 1,
    ...overrides,
  };
}

describe('convergence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('detects convergence for tokens on multiple chains', () => {
    const [signal] = detectConvergence([acc()]);
    expect(signal).toMatchObject({
      symbol: 'ETH',
      chains: ['ethereum', 'base'],
      netflowUsd: 1_200_000,
      buyVolumeUsd: 500_000,
      smartMoneyBuyers: 6,
    });
  });

  it('skips single-chain tokens', () => {
    expect(detectConvergence([acc({ chains: ['ethereum'] })])).toEqual([]);
  });

  it('baseline 2-chain zero-volume signals classify as LOW', () => {
    const [signal] = detectConvergence([acc({ totalNetflow: 0, totalBuyVolume: 0, smartMoneyBuyers: 0 })]);
    expect(signal.classification).toBe('LOW');
    expect(signal.score).toBe(20);
  });

  it('classifies high-scoring signals as EXTREME', () => {
    const [signal] = detectConvergence([
      acc({ chains: ['ethereum', 'base', 'solana', 'arbitrum', 'optimism'], totalNetflow: 9_000_000, totalBuyVolume: 5_000_000, smartMoneyBuyers: 10 }),
    ]);
    expect(signal.classification).toBe('EXTREME');
    expect(signal.score).toBeGreaterThanOrEqual(80);
  });

  it('classifies midrange as HIGH', () => {
    const [signal] = detectConvergence([
      acc({ chains: ['ethereum', 'base', 'solana'], totalNetflow: 2_000_000, totalBuyVolume: 200_000, smartMoneyBuyers: 7 }),
    ]);
    expect(signal.classification).toBe('HIGH');
  });

  it('classifies moderate scores', () => {
    const [signal] = detectConvergence([acc({ totalNetflow: 100_000, totalBuyVolume: 0, smartMoneyBuyers: 1 })]);
    expect(signal.classification).toBe('MODERATE');
  });

  it('classifies low scores', () => {
    const [signal] = detectConvergence([acc({ totalNetflow: 100, totalBuyVolume: 0, smartMoneyBuyers: 0 })]);
    expect(signal.classification).toBe('LOW');
  });

  it('sorts by descending score', () => {
    const signals = detectConvergence([
      acc({ symbol: 'AAA', address: 'aaa', totalNetflow: 2_000 }),
      acc({ symbol: 'BBB', address: 'bbb', chains: ['ethereum', 'base', 'solana'], totalNetflow: 4_000_000, smartMoneyBuyers: 9 }),
    ]);
    expect(signals.map(s => s.symbol)).toEqual(['BBB', 'AAA']);
  });

  it('includes symbol and chains in reason', () => {
    const [signal] = detectConvergence([acc()]);
    expect(signal.reason).toContain('ETH detected on 2 chains (ethereum, base)');
  });

  it('formats million-dollar netflow', () => {
    const [signal] = detectConvergence([acc({ totalNetflow: 2_500_000 })]);
    expect(signal.reason).toContain('$2.5M net inflow from smart money');
  });

  it('formats thousand-dollar netflow', () => {
    const [signal] = detectConvergence([acc({ totalNetflow: 25_000 })]);
    expect(signal.reason).toContain('$25K net inflow from smart money');
  });

  it('mentions buyer count when above threshold', () => {
    const [signal] = detectConvergence([acc({ smartMoneyBuyers: 8 })]);
    expect(signal.reason).toContain('8 independent smart money wallets accumulating');
  });

  it('adds strong-pattern note for high scores', () => {
    const [signal] = detectConvergence([
      acc({ chains: ['ethereum', 'base', 'solana'], totalNetflow: 3_000_000, totalBuyVolume: 1_000_000, smartMoneyBuyers: 9 }),
    ]);
    expect(signal.reason).toContain('Strong cross-chain accumulation pattern');
  });

  it('formats empty AI report', () => {
    expect(formatForAI([])).toBe('No cross-chain convergence signals detected in this scan.');
  });

  it('formats AI report with signal details', () => {
    const [signal] = detectConvergence([acc()]);
    const output = formatForAI([signal]);
    expect(output).toContain('Cross-Chain Convergence Report');
    expect(output).toContain('Token: ETH');
    expect(output).toContain('Score:');
    expect(output).toContain('SM Buyers: 6');
  });
});
