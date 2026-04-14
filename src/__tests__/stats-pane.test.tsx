import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { StatsPane } from '../components/StatsPane.js';
import type { Stats } from '../lib/tracker.js';
import type { TelemetrySummary } from '../lib/telemetry.js';

const mockStats: Stats = {
  totalSignals: 42,
  resolved: 30,
  pending: 12,
  wins: 22,
  losses: 8,
  winRate: 73.3,
  avgReturn24h: 5.2,
  avgReturn72h: 12.8,
  strongBuyWinRate: 85,
  buyWinRate: 70,
};

const mockTelemetry: TelemetrySummary & { creditsUsed: number | null } = {
  totalCalls: 156,
  byRole: {},
  byChain: {},
  avgLatencyMs: 245,
  cacheHitRate: 67,
  uptimeSeconds: 3600,
  creditsUsed: 42,
};

describe('StatsPane', () => {
  it('renders header', () => {
    const { lastFrame } = render(<StatsPane stats={mockStats} telemetry={mockTelemetry} />);
    expect(lastFrame()).toContain('Performance Dashboard');
  });

  it('renders total signals', () => {
    const { lastFrame } = render(<StatsPane stats={mockStats} telemetry={mockTelemetry} />);
    expect(lastFrame()).toContain('Total signals tracked: 42');
  });

  it('renders win rate', () => {
    const { lastFrame } = render(<StatsPane stats={mockStats} telemetry={mockTelemetry} />);
    expect(lastFrame()).toContain('Hit rate');
    expect(lastFrame()).toContain('73.3%');
  });

  it('renders avg return', () => {
    const { lastFrame } = render(<StatsPane stats={mockStats} telemetry={mockTelemetry} />);
    expect(lastFrame()).toContain('Avg return');
    expect(lastFrame()).toContain('12.8%');
  });

  it('renders API calls', () => {
    const { lastFrame } = render(<StatsPane stats={mockStats} telemetry={mockTelemetry} />);
    expect(lastFrame()).toContain('API calls made: 156');
  });

  it('renders credits used', () => {
    const { lastFrame } = render(<StatsPane stats={mockStats} telemetry={mockTelemetry} />);
    expect(lastFrame()).toContain('Credits used: 42');
  });

  it('renders N/A when credits null', () => {
    const noCredits = { ...mockTelemetry, creditsUsed: null };
    const { lastFrame } = render(<StatsPane stats={mockStats} telemetry={noCredits} />);
    expect(lastFrame()).toContain('Credits used: N/A');
  });

  it('renders resolved and pending counts', () => {
    const { lastFrame } = render(<StatsPane stats={mockStats} telemetry={mockTelemetry} />);
    const frame = lastFrame()!;
    expect(frame).toContain('Resolved 30');
    expect(frame).toContain('Pending 12');
  });

  it('renders latency and cache info', () => {
    const { lastFrame } = render(<StatsPane stats={mockStats} telemetry={mockTelemetry} />);
    const frame = lastFrame()!;
    expect(frame).toContain('Avg latency 245ms');
    expect(frame).toContain('Cache hit rate 67%');
    expect(frame).toContain('Uptime 3600s');
  });

  it('handles zero stats', () => {
    const empty: Stats = {
      totalSignals: 0, resolved: 0, pending: 0, wins: 0, losses: 0,
      winRate: 0, avgReturn24h: 0, avgReturn72h: 0, strongBuyWinRate: 0, buyWinRate: 0,
    };
    const { lastFrame } = render(<StatsPane stats={empty} telemetry={mockTelemetry} />);
    expect(lastFrame()).toContain('Total signals tracked: 0');
  });
});
