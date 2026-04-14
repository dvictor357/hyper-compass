import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { SignalPane } from '../components/SignalPane.js';
import type { AlphaSignal } from '../lib/signal-engine.js';

const mockSignals: AlphaSignal[] = [
  {
    id: 'sig-1',
    symbol: 'ETH',
    chains: ['ethereum', 'arbitrum', 'base'],
    convergenceScore: 88,
    aiConviction: 82,
    compositeScore: 86,
    classification: 'STRONG_BUY',
    thesis: 'Accumulation',
    risks: [],
    catalysts: [],
    timeHorizon: '72h',
    historicalPattern: 'test',
    netflowUsd: 2_500_000,
    buyVolumeUsd: 1_000_000,
    smartMoneyBuyers: 12,
    detectedAt: Date.now(),
    analyzedAt: Date.now(),
  },
  {
    id: 'sig-2',
    symbol: 'LINK',
    chains: ['ethereum'],
    convergenceScore: 45,
    aiConviction: 30,
    compositeScore: 40,
    classification: 'WATCH',
    thesis: 'Moderate',
    risks: ['risk'],
    catalysts: [],
    timeHorizon: '1w',
    historicalPattern: 'test',
    netflowUsd: 500_000,
    buyVolumeUsd: 200_000,
    smartMoneyBuyers: 4,
    detectedAt: Date.now(),
    analyzedAt: Date.now(),
  },
];

describe('SignalPane', () => {
  it('renders header', () => {
    const { lastFrame } = render(<SignalPane signals={[]} />);
    expect(lastFrame()).toContain('Ranked Convergence Signals');
  });

  it('renders empty state', () => {
    const { lastFrame } = render(<SignalPane signals={[]} />);
    expect(lastFrame()).toContain('No ranked signals');
  });

  it('renders signal symbols', () => {
    const { lastFrame } = render(<SignalPane signals={mockSignals} />);
    const frame = lastFrame()!;
    expect(frame).toContain('ETH');
    expect(frame).toContain('LINK');
  });

  it('renders chain list', () => {
    const { lastFrame } = render(<SignalPane signals={mockSignals} />);
    expect(lastFrame()).toContain('ethereum,arbitrum');
  });

  it('renders convergence scores', () => {
    const { lastFrame } = render(<SignalPane signals={mockSignals} />);
    const frame = lastFrame()!;
    expect(frame).toContain('88');
    expect(frame).toContain('45');
  });

  it('renders AI conviction scores', () => {
    const { lastFrame } = render(<SignalPane signals={mockSignals} />);
    const frame = lastFrame()!;
    expect(frame).toContain('82');
    expect(frame).toContain('30');
  });

  it('renders rank numbers', () => {
    const { lastFrame } = render(<SignalPane signals={mockSignals} />);
    const frame = lastFrame()!;
    expect(frame).toContain('1');
    expect(frame).toContain('2');
  });

  it('renders trend arrows', () => {
    const { lastFrame } = render(<SignalPane signals={mockSignals} />);
    const frame = lastFrame()!;
    expect(frame).toContain('^');
    expect(frame).toContain('>');
  });

  it('renders column headers', () => {
    const { lastFrame } = render(<SignalPane signals={mockSignals} />);
    const frame = lastFrame()!;
    expect(frame).toContain('RK');
    expect(frame).toContain('TOKEN');
    expect(frame).toContain('CHAINS');
    expect(frame).toContain('CONV');
  });

  it('limits to 8 signals', () => {
    const many: AlphaSignal[] = Array.from({ length: 12 }, (_, i) => ({
      ...mockSignals[0],
      id: `sig-${i}`,
      symbol: `TK${i}`,
      compositeScore: 90 - i * 5,
    }));
    const { lastFrame } = render(<SignalPane signals={many} />);
    const frame = lastFrame()!;
    expect(frame).toContain('TK0');
    expect(frame).toContain('TK7');
    expect(frame).not.toContain('TK8');
  });
});
