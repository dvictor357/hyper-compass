import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { SyndicatePane, type SyndicateDisplay } from '../components/SyndicatePane.js';

const mockSyndicates: SyndicateDisplay[] = [
  {
    id: 'SYN-001',
    token: 'ETH',
    wallets: 12,
    chains: ['ethereum', 'arbitrum', 'base'],
    totalValueUsd: 5_240_000,
    coordinationScore: 92,
    controller: '0x28C6c06298d514Db089934071355E5743bf21d60',
    windowMinutes: 18,
  },
  {
    id: 'SYN-002',
    token: 'LINK',
    wallets: 4,
    chains: ['ethereum'],
    totalValueUsd: 500_000,
    coordinationScore: 35,
    controller: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    windowMinutes: 30,
  },
];

describe('SyndicatePane', () => {
  it('renders header', () => {
    const { lastFrame } = render(<SyndicatePane syndicates={[]} />);
    expect(lastFrame()).toContain('Syndicate Detection');
  });

  it('renders empty state', () => {
    const { lastFrame } = render(<SyndicatePane syndicates={[]} />);
    expect(lastFrame()).toContain('Scanning for coordinated groups');
  });

  it('renders syndicate rows', () => {
    const { lastFrame } = render(<SyndicatePane syndicates={mockSyndicates} />);
    const frame = lastFrame()!;
    expect(frame).toContain('ETH');
    expect(frame).toContain('LINK');
  });

  it('shows wallet count', () => {
    const { lastFrame } = render(<SyndicatePane syndicates={mockSyndicates} />);
    expect(lastFrame()).toContain('12w');
  });

  it('shows chain list', () => {
    const { lastFrame } = render(<SyndicatePane syndicates={mockSyndicates} />);
    expect(lastFrame()).toContain('ethereum,arbi');
  });

  it('formats USD value', () => {
    const { lastFrame } = render(<SyndicatePane syndicates={mockSyndicates} />);
    expect(lastFrame()).toContain('$5.2M');
  });

  it('shows coordination score and tag', () => {
    const { lastFrame } = render(<SyndicatePane syndicates={mockSyndicates} />);
    const frame = lastFrame()!;
    expect(frame).toContain('92');
    expect(frame).toContain('EXTRE');
    expect(frame).toContain('35');
    expect(frame).toContain('LOW');
  });

  it('abbreviates controller address', () => {
    const { lastFrame } = render(<SyndicatePane syndicates={mockSyndicates} />);
    expect(lastFrame()).toContain('0x28C6..');
  });

  it('shows syndicate count summary', () => {
    const { lastFrame } = render(<SyndicatePane syndicates={mockSyndicates} />);
    expect(lastFrame()).toContain('2 syndicates');
  });

  it('limits to 6 syndicates', () => {
    const many: SyndicateDisplay[] = Array.from({ length: 10 }, (_, i) => ({
      id: `SYN-${i}`,
      token: `TK${i}`,
      wallets: 3,
      chains: ['ethereum'],
      totalValueUsd: 100_000,
      coordinationScore: 50,
      controller: '0xABCDEF1234567890abcdef1234567890ABCDEF12',
      windowMinutes: 15,
    }));
    const { lastFrame } = render(<SyndicatePane syndicates={many} />);
    const frame = lastFrame()!;
    expect(frame).toContain('TK0');
    expect(frame).toContain('TK5');
    expect(frame).not.toContain('TK6');
  });

  it('shows singular for 1 syndicate', () => {
    const { lastFrame } = render(<SyndicatePane syndicates={[mockSyndicates[0]]} />);
    expect(lastFrame()).toContain('1 syndicate');
    expect(lastFrame()).not.toContain('1 syndicates');
  });
});
