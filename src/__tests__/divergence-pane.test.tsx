import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { DivergencePane, type DivergenceDisplay } from '../components/DivergencePane.js';

const mockDivergences: DivergenceDisplay[] = [
  {
    token: 'ETH',
    smDirection: 'bullish',
    smConfidence: 87,
    polySentiment: 42,
    divergenceScore: 78,
    marketQuestion: 'Will ETH be above $4000?',
  },
  {
    token: 'BTC',
    smDirection: 'bearish',
    smConfidence: 61,
    polySentiment: 78,
    divergenceScore: 64,
    marketQuestion: 'Will BTC hit $120K?',
  },
];

describe('DivergencePane', () => {
  it('renders header', () => {
    const { lastFrame } = render(<DivergencePane divergences={[]} />);
    expect(lastFrame()).toContain('SM vs Polymarket Divergence');
  });

  it('renders empty state', () => {
    const { lastFrame } = render(<DivergencePane divergences={[]} />);
    expect(lastFrame()).toContain('Fetching prediction market');
  });

  it('renders token names', () => {
    const { lastFrame } = render(<DivergencePane divergences={mockDivergences} />);
    const frame = lastFrame()!;
    expect(frame).toContain('ETH');
    expect(frame).toContain('BTC');
  });

  it('renders direction arrows', () => {
    const { lastFrame } = render(<DivergencePane divergences={mockDivergences} />);
    const frame = lastFrame()!;
    expect(frame).toContain('BULL');
    expect(frame).toContain('BEAR');
  });

  it('renders divergence scores', () => {
    const { lastFrame } = render(<DivergencePane divergences={mockDivergences} />);
    const frame = lastFrame()!;
    expect(frame).toContain('DIV:78');
    expect(frame).toContain('DIV:64');
  });

  it('renders market questions', () => {
    const { lastFrame } = render(<DivergencePane divergences={mockDivergences} />);
    const frame = lastFrame()!;
    expect(frame).toContain('Will ETH be above');
    expect(frame).toContain('Will BTC hit');
  });

  it('renders confidence percentages', () => {
    const { lastFrame } = render(<DivergencePane divergences={mockDivergences} />);
    const frame = lastFrame()!;
    expect(frame).toContain('87%');
    expect(frame).toContain('42%');
    expect(frame).toContain('61%');
    expect(frame).toContain('78%');
  });

  it('shows high-divergence count', () => {
    const { lastFrame } = render(<DivergencePane divergences={mockDivergences} />);
    expect(lastFrame()).toContain('high-divergence signals');
  });

  it('renders SM and POLY bar labels', () => {
    const { lastFrame } = render(<DivergencePane divergences={mockDivergences} />);
    const frame = lastFrame()!;
    expect(frame).toContain('SM');
    expect(frame).toContain('POLY');
  });

  it('limits to 5 divergences', () => {
    const many: DivergenceDisplay[] = Array.from({ length: 8 }, (_, i) => ({
      token: `TK${i}`,
      smDirection: 'bullish' as const,
      smConfidence: 70,
      polySentiment: 50,
      divergenceScore: 60,
      marketQuestion: `Question ${i}?`,
    }));
    const { lastFrame } = render(<DivergencePane divergences={many} />);
    const frame = lastFrame()!;
    expect(frame).toContain('TK0');
    expect(frame).toContain('TK4');
    expect(frame).not.toContain('TK5');
  });
});
