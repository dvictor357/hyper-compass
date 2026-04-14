import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectSyndicates, formatReport, type WalletTrade } from '../lib/syndicate.js';

function trade(overrides: Partial<WalletTrade> = {}): WalletTrade {
  return {
    wallet: '0x' + Math.random().toString(16).slice(2, 42),
    token: 'ETH',
    chain: 'ethereum',
    timestamp: Date.now(),
    valueUsd: 100_000,
    side: 'buy',
    ...overrides,
  };
}

const T = 1_700_000_000_000;

describe('detectSyndicates', () => {
  it('detects 3 wallets buying same token within window', () => {
    const trades = [
      trade({ wallet: '0xAAA', token: 'PEPE', timestamp: T, valueUsd: 200_000 }),
      trade({ wallet: '0xBBB', token: 'PEPE', timestamp: T + 5 * 60_000, valueUsd: 150_000 }),
      trade({ wallet: '0xCCC', token: 'PEPE', timestamp: T + 10 * 60_000, valueUsd: 300_000 }),
    ];

    const report = detectSyndicates(trades);
    expect(report.syndicates).toHaveLength(1);
    expect(report.syndicates[0].token).toBe('PEPE');
    expect(report.syndicates[0].wallets).toHaveLength(3);
    expect(report.syndicates[0].totalValueUsd).toBe(650_000);
  });

  it('no false positive when trades are hours apart', () => {
    const trades = [
      trade({ wallet: '0xAAA', timestamp: T }),
      trade({ wallet: '0xBBB', timestamp: T + 2 * 3_600_000 }),
      trade({ wallet: '0xCCC', timestamp: T + 4 * 3_600_000 }),
    ];

    expect(detectSyndicates(trades, 30).syndicates).toHaveLength(0);
  });

  it('requires minimum 3 unique wallets', () => {
    const trades = [
      trade({ wallet: '0xAAA', token: 'LINK', timestamp: T }),
      trade({ wallet: '0xBBB', token: 'LINK', timestamp: T + 60_000 }),
    ];

    expect(detectSyndicates(trades).syndicates).toHaveLength(0);
  });

  it('same wallet trading twice does not count as two wallets', () => {
    const trades = [
      trade({ wallet: '0xAAA', token: 'UNI', timestamp: T }),
      trade({ wallet: '0xAAA', token: 'UNI', timestamp: T + 60_000 }),
      trade({ wallet: '0xBBB', token: 'UNI', timestamp: T + 120_000 }),
    ];

    expect(detectSyndicates(trades).syndicates).toHaveLength(0);
  });

  it('identifies controller as earliest wallet', () => {
    const trades = [
      trade({ wallet: '0xCTRL', token: 'SOL', timestamp: T }),
      trade({ wallet: '0xF1', token: 'SOL', timestamp: T + 3 * 60_000 }),
      trade({ wallet: '0xF2', token: 'SOL', timestamp: T + 5 * 60_000 }),
    ];

    expect(detectSyndicates(trades).syndicates[0].controller).toBe('0xCTRL');
  });

  it('detects cross-chain syndicate', () => {
    const trades = [
      trade({ wallet: '0xAAA', token: 'ETH', chain: 'ethereum', timestamp: T }),
      trade({ wallet: '0xBBB', token: 'ETH', chain: 'arbitrum', timestamp: T + 5 * 60_000 }),
      trade({ wallet: '0xCCC', token: 'ETH', chain: 'base', timestamp: T + 10 * 60_000 }),
    ];

    const syn = detectSyndicates(trades).syndicates[0];
    expect(syn.chains).toContain('ethereum');
    expect(syn.chains).toContain('arbitrum');
    expect(syn.chains).toContain('base');
  });

  it('cross-chain gets higher score than single-chain', () => {
    const single = detectSyndicates([
      trade({ wallet: '0xA', token: 'PEPE', chain: 'ethereum', timestamp: T }),
      trade({ wallet: '0xB', token: 'PEPE', chain: 'ethereum', timestamp: T + 10 * 60_000 }),
      trade({ wallet: '0xC', token: 'PEPE', chain: 'ethereum', timestamp: T + 15 * 60_000 }),
    ]);

    const cross = detectSyndicates([
      trade({ wallet: '0xA', token: 'PEPE', chain: 'ethereum', timestamp: T }),
      trade({ wallet: '0xB', token: 'PEPE', chain: 'base', timestamp: T + 10 * 60_000 }),
      trade({ wallet: '0xC', token: 'PEPE', chain: 'arbitrum', timestamp: T + 15 * 60_000 }),
    ]);

    expect(cross.syndicates[0].coordinationScore).toBeGreaterThan(single.syndicates[0].coordinationScore);
  });

  it('score is 100 for simultaneous cross-chain trades', () => {
    const report = detectSyndicates([
      trade({ wallet: '0xA', token: 'X', chain: 'ethereum', timestamp: T }),
      trade({ wallet: '0xB', token: 'X', chain: 'base', timestamp: T }),
      trade({ wallet: '0xC', token: 'X', chain: 'arbitrum', timestamp: T }),
    ]);
    expect(report.syndicates[0].coordinationScore).toBe(100);
  });

  it('score decreases with wider time spread', () => {
    const tight = detectSyndicates([
      trade({ wallet: '0xA', token: 'T1', timestamp: T }),
      trade({ wallet: '0xB', token: 'T1', timestamp: T + 60_000 }),
      trade({ wallet: '0xC', token: 'T1', timestamp: T + 120_000 }),
    ]);

    const wide = detectSyndicates([
      trade({ wallet: '0xA', token: 'T2', timestamp: T }),
      trade({ wallet: '0xB', token: 'T2', timestamp: T + 15 * 60_000 }),
      trade({ wallet: '0xC', token: 'T2', timestamp: T + 25 * 60_000 }),
    ]);

    expect(tight.syndicates[0].coordinationScore).toBeGreaterThan(wide.syndicates[0].coordinationScore);
  });

  it('ignores sell trades', () => {
    const trades = [
      trade({ wallet: '0xA', token: 'ETH', side: 'sell', timestamp: T }),
      trade({ wallet: '0xB', token: 'ETH', side: 'sell', timestamp: T + 60_000 }),
      trade({ wallet: '0xC', token: 'ETH', side: 'sell', timestamp: T + 120_000 }),
    ];

    expect(detectSyndicates(trades).syndicates).toHaveLength(0);
  });

  it('groups case-insensitively by token', () => {
    const trades = [
      trade({ wallet: '0xA', token: 'pepe', timestamp: T }),
      trade({ wallet: '0xB', token: 'PEPE', timestamp: T + 60_000 }),
      trade({ wallet: '0xC', token: 'Pepe', timestamp: T + 120_000 }),
    ];

    const report = detectSyndicates(trades);
    expect(report.syndicates).toHaveLength(1);
    expect(report.syndicates[0].token).toBe('PEPE');
  });

  it('detects multiple syndicates for different tokens', () => {
    const trades = [
      trade({ wallet: '0xA1', token: 'PEPE', timestamp: T }),
      trade({ wallet: '0xA2', token: 'PEPE', timestamp: T + 60_000 }),
      trade({ wallet: '0xA3', token: 'PEPE', timestamp: T + 120_000 }),
      trade({ wallet: '0xB1', token: 'SOL', timestamp: T + 1_000 }),
      trade({ wallet: '0xB2', token: 'SOL', timestamp: T + 61_000 }),
      trade({ wallet: '0xB3', token: 'SOL', timestamp: T + 121_000 }),
    ];

    const report = detectSyndicates(trades);
    expect(report.syndicates).toHaveLength(2);
    expect(report.syndicates.map(s => s.token).sort()).toEqual(['PEPE', 'SOL']);
  });

  it('respects custom window size', () => {
    const trades = [
      trade({ wallet: '0xA', timestamp: T }),
      trade({ wallet: '0xB', timestamp: T + 8 * 60_000 }),
      trade({ wallet: '0xC', timestamp: T + 12 * 60_000 }),
    ];

    expect(detectSyndicates(trades, 5).syndicates).toHaveLength(0);
    expect(detectSyndicates(trades, 15).syndicates).toHaveLength(1);
  });

  it('calculates total value correctly', () => {
    const trades = [
      trade({ wallet: '0xA', valueUsd: 100_000, timestamp: T }),
      trade({ wallet: '0xB', valueUsd: 200_000, timestamp: T + 60_000 }),
      trade({ wallet: '0xC', valueUsd: 300_000, timestamp: T + 120_000 }),
    ];

    expect(detectSyndicates(trades).syndicates[0].totalValueUsd).toBe(600_000);
  });

  it('tracks wallet and trade counts', () => {
    const trades = [
      trade({ wallet: '0xA', timestamp: T }),
      trade({ wallet: '0xB', timestamp: T + 60_000 }),
      trade({ wallet: '0xC', timestamp: T + 120_000 }),
      trade({ wallet: '0xD', token: 'LINK', timestamp: T + 7_200_000 }),
    ];

    const report = detectSyndicates(trades);
    expect(report.walletsAnalyzed).toBe(4);
    expect(report.tradesAnalyzed).toBe(4);
  });

  it('windowMinutes reflects actual span', () => {
    const trades = [
      trade({ wallet: '0xA', timestamp: T }),
      trade({ wallet: '0xB', timestamp: T + 7 * 60_000 }),
      trade({ wallet: '0xC', timestamp: T + 12 * 60_000 }),
    ];

    expect(detectSyndicates(trades).syndicates[0].windowMinutes).toBe(12);
  });

  it('handles empty trades', () => {
    const report = detectSyndicates([]);
    expect(report.syndicates).toHaveLength(0);
    expect(report.walletsAnalyzed).toBe(0);
  });

  it('handles 5+ wallets in one syndicate', () => {
    const trades = [
      trade({ wallet: '0xW1', token: 'BONK', timestamp: T }),
      trade({ wallet: '0xW2', token: 'BONK', timestamp: T + 60_000 }),
      trade({ wallet: '0xW3', token: 'BONK', timestamp: T + 120_000 }),
      trade({ wallet: '0xW4', token: 'BONK', timestamp: T + 180_000 }),
      trade({ wallet: '0xW5', token: 'BONK', timestamp: T + 240_000 }),
    ];

    expect(detectSyndicates(trades).syndicates[0].wallets).toHaveLength(5);
  });

  it('sorts syndicates by score descending', () => {
    const trades = [
      trade({ wallet: '0xA1', token: 'AAA', timestamp: T }),
      trade({ wallet: '0xA2', token: 'AAA', timestamp: T + 15 * 60_000 }),
      trade({ wallet: '0xA3', token: 'AAA', timestamp: T + 25 * 60_000 }),
      trade({ wallet: '0xB1', token: 'BBB', timestamp: T }),
      trade({ wallet: '0xB2', token: 'BBB', timestamp: T + 60_000 }),
      trade({ wallet: '0xB3', token: 'BBB', timestamp: T + 120_000 }),
    ];

    const report = detectSyndicates(trades);
    expect(report.syndicates[0].token).toBe('BBB');
    expect(report.syndicates[0].coordinationScore).toBeGreaterThan(report.syndicates[1].coordinationScore);
  });

  it('score is between 0 and 100', () => {
    const trades = [
      trade({ wallet: '0xA', chain: 'ethereum', timestamp: T }),
      trade({ wallet: '0xB', chain: 'base', timestamp: T }),
      trade({ wallet: '0xC', chain: 'arbitrum', timestamp: T }),
    ];

    const score = detectSyndicates(trades).syndicates[0].coordinationScore;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('no syndicate when only 2 unique wallets even with repeated trades', () => {
    const trades = [
      trade({ wallet: '0xA', valueUsd: 100_000, timestamp: T }),
      trade({ wallet: '0xA', valueUsd: 50_000, timestamp: T + 30_000 }),
      trade({ wallet: '0xA', valueUsd: 75_000, timestamp: T + 60_000 }),
      trade({ wallet: '0xB', valueUsd: 200_000, timestamp: T + 90_000 }),
    ];

    expect(detectSyndicates(trades).syndicates).toHaveLength(0);
  });

  it('id contains token and timestamp', () => {
    const trades = [
      trade({ wallet: '0xA', token: 'DOGE', timestamp: T }),
      trade({ wallet: '0xB', token: 'DOGE', timestamp: T + 60_000 }),
      trade({ wallet: '0xC', token: 'DOGE', timestamp: T + 120_000 }),
    ];

    const id = detectSyndicates(trades).syndicates[0].id;
    expect(id).toContain('DOGE');
    expect(id).toContain(String(T));
  });
});

describe('formatReport', () => {
  it('formats empty report', () => {
    expect(formatReport(detectSyndicates([]))).toContain('No coordinated groups detected');
  });

  it('formats report with syndicates', () => {
    const trades = [
      trade({ wallet: '0xA', token: 'PEPE', chain: 'ethereum', valueUsd: 200_000, timestamp: T }),
      trade({ wallet: '0xB', token: 'PEPE', chain: 'base', valueUsd: 150_000, timestamp: T + 60_000 }),
      trade({ wallet: '0xC', token: 'PEPE', chain: 'ethereum', valueUsd: 300_000, timestamp: T + 120_000 }),
    ];

    const out = formatReport(detectSyndicates(trades));
    expect(out).toContain('PEPE');
    expect(out).toContain('Coordination:');
    expect(out).toContain('Controller:');
    expect(out).toContain('syndicate(s)');
  });
});
