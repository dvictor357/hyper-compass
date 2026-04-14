import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { AIPane } from '../components/AIPane.js';
import type { AIAnalysis } from '../lib/ai-analyzer.js';

const mockAnalysis: AIAnalysis = {
  id: 'ai-1',
  signalId: 'conv-ETH-1',
  thesis: 'Smart money is accumulating ETH across 4 chains with $2.5M net inflow.',
  conviction: 82,
  timeHorizon: '72h',
  risks: ['Market downturn', 'Regulatory risk'],
  catalysts: ['ETF inflows', 'Protocol upgrade'],
  historicalPattern: 'Similar to Q3 2025 breakout',
  generatedAt: Date.now(),
  model: 'mock',
};

describe('AIPane', () => {
  it('renders header', () => {
    const { lastFrame } = render(<AIPane analysis={null} loading={false} />);
    expect(lastFrame()).toContain('AI Trade Thesis');
  });

  it('renders empty state when no analysis', () => {
    const { lastFrame } = render(<AIPane analysis={null} loading={false} />);
    expect(lastFrame()).toContain('No AI analysis available');
  });

  it('renders loading state', () => {
    const { lastFrame } = render(<AIPane analysis={null} loading={true} />);
    expect(lastFrame()).toContain('Generating cross-chain thesis');
  });

  it('renders thesis text', () => {
    const { lastFrame } = render(<AIPane analysis={mockAnalysis} loading={false} />);
    expect(lastFrame()).toContain('Smart money is accumulating ETH');
  });

  it('renders conviction score', () => {
    const { lastFrame } = render(<AIPane analysis={mockAnalysis} loading={false} />);
    expect(lastFrame()).toContain('82/100');
  });

  it('renders time horizon', () => {
    const { lastFrame } = render(<AIPane analysis={mockAnalysis} loading={false} />);
    expect(lastFrame()).toContain('Horizon: 72h');
  });

  it('renders catalysts', () => {
    const { lastFrame } = render(<AIPane analysis={mockAnalysis} loading={false} />);
    const frame = lastFrame()!;
    expect(frame).toContain('Catalysts');
    expect(frame).toContain('ETF inflows');
    expect(frame).toContain('Protocol upgrade');
  });

  it('renders risks', () => {
    const { lastFrame } = render(<AIPane analysis={mockAnalysis} loading={false} />);
    const frame = lastFrame()!;
    expect(frame).toContain('Risks');
    expect(frame).toContain('Market downturn');
    expect(frame).toContain('Regulatory risk');
  });

  it('renders empty catalysts gracefully', () => {
    const noCatalysts = { ...mockAnalysis, catalysts: [] };
    const { lastFrame } = render(<AIPane analysis={noCatalysts} loading={false} />);
    expect(lastFrame()).toContain('None identified');
  });

  it('renders empty risks gracefully', () => {
    const noRisks = { ...mockAnalysis, risks: [] };
    const { lastFrame } = render(<AIPane analysis={noRisks} loading={false} />);
    expect(lastFrame()).toContain('No explicit risks');
  });

  it('limits catalysts to 3', () => {
    const many = { ...mockAnalysis, catalysts: ['a', 'b', 'c', 'd', 'e'] };
    const { lastFrame } = render(<AIPane analysis={many} loading={false} />);
    const frame = lastFrame()!;
    expect(frame).toContain('- a');
    expect(frame).toContain('- c');
    expect(frame).not.toContain('- d');
  });

  it('limits risks to 3', () => {
    const many = { ...mockAnalysis, risks: ['r1', 'r2', 'r3', 'r4'] };
    const { lastFrame } = render(<AIPane analysis={many} loading={false} />);
    const frame = lastFrame()!;
    expect(frame).toContain('- r1');
    expect(frame).toContain('- r3');
    expect(frame).not.toContain('r4');
  });
});
