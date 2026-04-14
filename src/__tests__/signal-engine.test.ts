import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSignal, summarize, rankSignals } from '../lib/signal-engine.js';
import type { ConvergenceSignal } from '../lib/convergence.js';
import type { AIAnalysis } from '../lib/ai-analyzer.js';

function conv(overrides: Partial<ConvergenceSignal> = {}): ConvergenceSignal {
  return {
    id: 'conv-eth-1', token: '0xeth', symbol: 'ETH',
    chains: ['ethereum', 'base'], score: 80,
    netflowUsd: 1_000_000, buyVolumeUsd: 400_000, smartMoneyBuyers: 6,
    classification: 'HIGH', reason: 'Strong.', detectedAt: 1000,
    ...overrides,
  };
}

function ai(overrides: Partial<AIAnalysis> = {}): AIAnalysis {
  return {
    id: 'ai-1', signalId: 'conv-eth-1', thesis: 'ETH accumulation broadening.',
    conviction: 70, timeHorizon: '72h', risks: ['R1'], catalysts: ['C1'],
    historicalPattern: 'Pattern A', generatedAt: 2000, model: 'model-x',
    ...overrides,
  };
}

describe('signal-engine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('creates composite signal', () => {
    const s = createSignal(conv(), ai());
    expect(s).toMatchObject({
      symbol: 'ETH', chains: ['ethereum', 'base'],
      convergenceScore: 80, aiConviction: 70,
      compositeScore: 76, classification: 'STRONG_BUY',
      thesis: 'ETH accumulation broadening.',
    });
  });

  it('preserves metadata', () => {
    const s = createSignal(conv(), ai());
    expect(s.netflowUsd).toBe(1_000_000);
    expect(s.buyVolumeUsd).toBe(400_000);
    expect(s.smartMoneyBuyers).toBe(6);
    expect(s.detectedAt).toBe(1000);
    expect(s.analyzedAt).toBe(2000);
  });

  it('classifies >= 75 as STRONG_BUY', () => {
    expect(createSignal(conv({ score: 90 }), ai({ conviction: 90 })).classification).toBe('STRONG_BUY');
  });

  it('classifies >= 55 as BUY', () => {
    expect(createSignal(conv({ score: 60 }), ai({ conviction: 50 })).classification).toBe('BUY');
  });

  it('classifies >= 35 as WATCH', () => {
    expect(createSignal(conv({ score: 40 }), ai({ conviction: 30 })).classification).toBe('WATCH');
  });

  it('classifies lower as WEAK', () => {
    expect(createSignal(conv({ score: 20 }), ai({ conviction: 20 })).classification).toBe('WEAK');
  });

  it('ranks by descending composite', () => {
    const weak = createSignal(conv({ symbol: 'AAA', score: 20 }), ai({ signalId: 'AAA', conviction: 20 }));
    const strong = createSignal(conv({ symbol: 'BBB', score: 90 }), ai({ signalId: 'BBB', conviction: 80 }));
    expect(rankSignals([weak, strong]).map(s => s.symbol)).toEqual(['BBB', 'AAA']);
  });

  it('does not mutate original', () => {
    const a = createSignal(conv({ symbol: 'AAA', score: 50 }), ai({ signalId: 'AAA', conviction: 50 }));
    const b = createSignal(conv({ symbol: 'BBB', score: 80 }), ai({ signalId: 'BBB', conviction: 80 }));
    const orig = [a, b];
    rankSignals(orig);
    expect(orig.map(s => s.symbol)).toEqual(['AAA', 'BBB']);
  });

  it('empty summary', () => expect(summarize([])).toBe('No actionable signals detected.'));

  it('counts by classification', () => {
    const signals = [
      createSignal(conv({ symbol: 'AAA', score: 90 }), ai({ signalId: 'AAA', conviction: 90 })),
      createSignal(conv({ symbol: 'BBB', score: 65 }), ai({ signalId: 'BBB', conviction: 60 })),
      createSignal(conv({ symbol: 'CCC', score: 40 }), ai({ signalId: 'CCC', conviction: 30 })),
    ];
    const s = summarize(signals);
    expect(s).toContain('Total: 3');
    expect(s).toContain('STRONG_BUY: 1');
    expect(s).toContain('BUY: 1');
    expect(s).toContain('WATCH: 1');
  });

  it('includes top signal details', () => {
    const s = summarize([createSignal(conv(), ai())]);
    expect(s).toContain('STRONG_BUY ETH (76/100)');
    expect(s).toContain('Chains: ethereum, base');
    expect(s).toContain('Net Flow: $1,000,000 | Buyers: 6');
  });

  it('handles empty risks/catalysts', () => {
    const s = createSignal(conv(), ai({ risks: [], catalysts: [] }));
    expect(s.risks).toEqual([]);
    expect(s.catalysts).toEqual([]);
  });
});
