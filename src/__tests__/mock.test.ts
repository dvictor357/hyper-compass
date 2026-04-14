import { describe, expect, it } from 'vitest';
import { getMockData } from '../lib/mock.ts';

describe('getMockData', () => {
  it('returns ethereum netflow rows with core fields', () => {
    const data = getMockData('research smart-money netflow', ['--chain', 'ethereum']) as any[];
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toMatchObject({
      symbol: expect.any(String),
      address: expect.any(String),
      netFlow24h: expect.any(Number),
      netFlow7d: expect.any(Number),
      netFlow30d: expect.any(Number),
      traderCount: expect.any(Number),
      chain: 'ethereum',
    });
  });

  it('returns solana-specific netflow data', () => {
    const data = getMockData('research smart-money netflow', ['--chain', 'solana']) as any[];
    expect(data[0]?.symbol).toBe('SOL');
  });

  it('returns dex trades with expected fields', () => {
    const data = getMockData('research smart-money dex-trades', ['--chain', 'ethereum']) as any[];
    expect(data[0]).toMatchObject({
      boughtSymbol: expect.any(String),
      boughtAddress: expect.any(String),
      soldSymbol: expect.any(String),
      valueUsd: expect.any(Number),
      trader: expect.any(String),
      traderLabel: expect.any(String),
      chain: 'ethereum',
    });
  });

  it('returns screener rows with pricing fields', () => {
    const data = getMockData('research token screener', ['--chain', 'ethereum']) as any[];
    expect(data[0]).toMatchObject({
      symbol: expect.any(String),
      priceUsd: expect.any(String),
      change24h: expect.any(String),
      volume24h: expect.any(String),
      marketCap: expect.any(String),
    });
  });

  it('returns holdings as a subset of netflow data', () => {
    const data = getMockData('research smart-money holdings', ['--chain', 'ethereum']) as any[];
    expect(data).toHaveLength(3);
    expect(data[0]).toHaveProperty('netFlow24h');
  });

  it('returns account information', () => {
    expect(getMockData('account', [])).toEqual({
      plan: 'pro',
      creditsRemaining: 470,
    });
  });

  it('returns token info using the requested token symbol', () => {
    expect(getMockData('research token info', ['--chain', 'ethereum', '--token', 'BTC'])).toMatchObject({
      symbol: 'BTC',
      priceUsd: expect.any(String),
      marketCap: expect.any(String),
      volume24h: expect.any(String),
    });
  });

  it('returns profiler label data', () => {
    expect(getMockData('research profiler labels', ['--address', '0xabc', '--chain', 'ethereum'])).toMatchObject({
      labels: expect.arrayContaining(['Smart Trader', 'Fund']),
      firstSeen: expect.any(String),
    });
  });

  it('returns trade quote data', () => {
    expect(getMockData('trade quote', ['--chain', 'ethereum'])).toMatchObject({
      price: expect.any(String),
      priceImpact: expect.any(String),
      gasEstimate: expect.any(String),
      route: expect.any(String),
    });
  });

  it('returns empty array for unknown commands', () => {
    expect(getMockData('something unknown', [])).toEqual([]);
  });

  it('defaults to ethereum when no chain specified', () => {
    const data = getMockData('research smart-money netflow', []) as any[];
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].chain).toBe('ethereum');
  });
});
