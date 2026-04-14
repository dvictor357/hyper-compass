import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { FlowPane } from '../components/FlowPane.js';
import type { ChainScan } from '../lib/scanner.js';

const mockScan: ChainScan = {
  chain: 'ethereum',
  netflow: [
    { symbol: 'ETH', net_flow_24h_usd: '2500000', trader_count: '14', address: '0x1' },
    { symbol: 'LINK', net_flow_24h_usd: '-800000', trader_count: '6', address: '0x2' },
    { symbol: 'UNI', net_flow_24h_usd: '0', net_flow_7d_usd: '500000', trader_count: '3', address: '0x3' },
  ],
  dexTrades: [],
  topTokens: [],
  scannedAt: Date.now(),
};

describe('FlowPane', () => {
  it('renders header', () => {
    const { lastFrame } = render(<FlowPane scans={[]} />);
    expect(lastFrame()).toContain('Multi-Chain Netflow');
  });

  it('renders empty state', () => {
    const { lastFrame } = render(<FlowPane scans={[]} />);
    expect(lastFrame()).toContain('No flow data yet');
  });

  it('renders flow rows from scans', () => {
    const { lastFrame } = render(<FlowPane scans={[mockScan]} />);
    const frame = lastFrame()!;
    expect(frame).toContain('ETH');
    expect(frame).toContain('LINK');
    expect(frame).toContain('IN');
    expect(frame).toContain('OUT');
  });

  it('formats USD amounts', () => {
    const { lastFrame } = render(<FlowPane scans={[mockScan]} />);
    const frame = lastFrame()!;
    expect(frame).toContain('$2.50M');
    expect(frame).toContain('$-800.0K');
  });

  it('falls back to 7d flow when 24h is zero', () => {
    const { lastFrame } = render(<FlowPane scans={[mockScan]} />);
    expect(lastFrame()).toContain('UNI');
  });

  it('renders chain column', () => {
    const { lastFrame } = render(<FlowPane scans={[mockScan]} />);
    expect(lastFrame()).toContain('ethereum');
  });

  it('renders column headers', () => {
    const { lastFrame } = render(<FlowPane scans={[mockScan]} />);
    const frame = lastFrame()!;
    expect(frame).toContain('CHAIN');
    expect(frame).toContain('TOKEN');
    expect(frame).toContain('DIR');
    expect(frame).toContain('AMOUNT');
  });

  it('handles multiple scans', () => {
    const solScan: ChainScan = {
      chain: 'solana',
      netflow: [
        { symbol: 'SOL', net_flow_24h_usd: '1200000', trader_count: '8', address: 'so1' },
      ],
      dexTrades: [],
      topTokens: [],
      scannedAt: Date.now(),
    };
    const { lastFrame } = render(<FlowPane scans={[mockScan, solScan]} />);
    const frame = lastFrame()!;
    expect(frame).toContain('ethereum');
    expect(frame).toContain('solana');
    expect(frame).toContain('SOL');
  });

  it('limits to 8 rows', () => {
    const bigScan: ChainScan = {
      chain: 'ethereum',
      netflow: Array.from({ length: 15 }, (_, i) => ({
        symbol: `TK${i}`,
        net_flow_24h_usd: String((15 - i) * 100000),
        trader_count: '1',
        address: `0x${i}`,
      })),
      dexTrades: [],
      topTokens: [],
      scannedAt: Date.now(),
    };
    const { lastFrame } = render(<FlowPane scans={[bigScan]} />);
    const frame = lastFrame()!;
    expect(frame).toContain('TK0');
    expect(frame).not.toContain('TK9');
  });

  it('handles missing symbol gracefully', () => {
    const scan: ChainScan = {
      chain: 'base',
      netflow: [{ net_flow_24h_usd: '1000', trader_count: '1', address: '0x1' }],
      dexTrades: [],
      topTokens: [],
      scannedAt: Date.now(),
    };
    const { lastFrame } = render(<FlowPane scans={[scan]} />);
    expect(lastFrame()).toContain('???');
  });
});
