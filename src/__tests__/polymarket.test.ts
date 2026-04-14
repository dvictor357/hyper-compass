import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  matchToken, extractSentiment, deriveSmartMoneySignal,
  calculateDivergence, fetchMarkets, type MarketPosition,
} from '../lib/polymarket.js';

function market(overrides: Partial<MarketPosition> = {}): MarketPosition {
  return {
    marketId: 'test-1',
    question: 'Will Bitcoin be above $120,000 by July 2026?',
    yesPrice: 0.42,
    noPrice: 0.58,
    volume24h: 2_000_000,
    token: 'BTC',
    ...overrides,
  };
}

describe('polymarket', () => {
  describe('matchToken', () => {
    it('matches Bitcoin', () => expect(matchToken('Will Bitcoin hit $100k?')).toBe('BTC'));
    it('matches BTC', () => expect(matchToken('BTC above $120,000?')).toBe('BTC'));
    it('matches Ethereum', () => expect(matchToken('Will Ethereum reach $5,000?')).toBe('ETH'));
    it('matches ETH', () => expect(matchToken('ETH price prediction for 2026')).toBe('ETH'));
    it('matches Solana', () => expect(matchToken('Solana above $300 by June?')).toBe('SOL'));
    it('matches Chainlink', () => expect(matchToken('Will Chainlink reach $50?')).toBe('LINK'));
    it('returns null for non-crypto', () => expect(matchToken('Will it rain tomorrow?')).toBeNull());
    it('returns null for empty', () => expect(matchToken('')).toBeNull());
    it('is case insensitive', () => expect(matchToken('BITCOIN price above $200k?')).toBe('BTC'));
    it('does not match partial words', () => expect(matchToken('What method will they use?')).toBeNull());
  });

  describe('extractSentiment', () => {
    it('converts yesPrice to percentage', () => expect(extractSentiment(market({ yesPrice: 0.72 }))).toBe(72));
    it('returns 0 for 0', () => expect(extractSentiment(market({ yesPrice: 0 }))).toBe(0));
    it('returns 100 for 1.0', () => expect(extractSentiment(market({ yesPrice: 1.0 }))).toBe(100));
    it('rounds', () => expect(extractSentiment(market({ yesPrice: 0.555 }))).toBe(56));
  });

  describe('deriveSmartMoneySignal', () => {
    it('positive netflow = bullish', () => {
      expect(deriveSmartMoneySignal({ netflowUsd: 1_000_000, traderCount: 5 }).direction).toBe('bullish');
    });
    it('negative netflow = bearish', () => {
      expect(deriveSmartMoneySignal({ netflowUsd: -500_000, traderCount: 3 }).direction).toBe('bearish');
    });
    it('zero = bullish with 0 confidence', () => {
      const r = deriveSmartMoneySignal({ netflowUsd: 0, traderCount: 0 });
      expect(r.direction).toBe('bullish');
      expect(r.confidence).toBe(0);
    });
    it('high flow + traders = high confidence', () => {
      expect(deriveSmartMoneySignal({ netflowUsd: 3_000_000, traderCount: 10 }).confidence).toBeGreaterThanOrEqual(90);
    });
    it('low flow + traders = low confidence', () => {
      expect(deriveSmartMoneySignal({ netflowUsd: 100_000, traderCount: 1 }).confidence).toBeLessThan(20);
    });
    it('caps at 100', () => {
      expect(deriveSmartMoneySignal({ netflowUsd: 10_000_000, traderCount: 20 }).confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateDivergence', () => {
    const netflows = [
      { token: 'ETH', netflowUsd: 2_450_000, traderCount: 12 },
      { token: 'LINK', netflowUsd: 560_000, traderCount: 5 },
      { token: 'SOL', netflowUsd: -500_000, traderCount: 3 },
    ];
    const markets: MarketPosition[] = [
      market({ marketId: 'eth', question: 'ETH $5k?', yesPrice: 0.35, token: 'ETH' }),
      market({ marketId: 'link', question: 'LINK $50?', yesPrice: 0.28, token: 'LINK' }),
      market({ marketId: 'sol', question: 'SOL $300?', yesPrice: 0.75, token: 'SOL' }),
    ];

    it('one divergence per matched token', () => expect(calculateDivergence(netflows, markets)).toHaveLength(3));
    it('sorted by score descending', () => {
      const r = calculateDivergence(netflows, markets);
      for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
    });
    it('ETH bullish SM vs bearish crowd = divergence', () => {
      const eth = calculateDivergence(netflows, markets).find(d => d.token === 'ETH')!;
      expect(eth.smDirection).toBe('bullish');
      expect(eth.crowdSentiment).toBe(35);
      expect(eth.score).toBeGreaterThan(30);
    });
    it('SOL bearish SM vs bullish crowd = divergence', () => {
      const sol = calculateDivergence(netflows, markets).find(d => d.token === 'SOL')!;
      expect(sol.smDirection).toBe('bearish');
      expect(sol.crowdSentiment).toBe(75);
      expect(sol.score).toBeGreaterThan(20);
    });
    it('empty when no match', () => expect(calculateDivergence([{ token: 'DOGE', netflowUsd: 100_000, traderCount: 2 }], markets)).toHaveLength(0));
    it('empty for empty inputs', () => expect(calculateDivergence([], [])).toEqual([]));
    it('uses highest-volume market', () => {
      const r = calculateDivergence(
        [{ token: 'ETH', netflowUsd: 1_000_000, traderCount: 5 }],
        [market({ token: 'ETH', volume24h: 100, question: 'Low vol' }), market({ token: 'ETH', volume24h: 5_000_000, question: 'High vol' })],
      );
      expect(r[0].question).toBe('High vol');
    });
    it('includes explanation', () => {
      for (const d of calculateDivergence(netflows, markets)) {
        expect(d.explanation.length).toBeGreaterThan(20);
      }
    });
    it('all scores 0-100', () => {
      for (const d of calculateDivergence(netflows, markets)) {
        expect(d.score).toBeGreaterThanOrEqual(0);
        expect(d.score).toBeLessThanOrEqual(100);
        expect(d.smConfidence).toBeGreaterThanOrEqual(0);
        expect(d.smConfidence).toBeLessThanOrEqual(100);
      }
    });
    it('low divergence when SM and crowd agree', () => {
      const r = calculateDivergence([{ token: 'ETH', netflowUsd: 0, traderCount: 0 }], [market({ token: 'ETH', yesPrice: 0.50 })]);
      expect(r[0].score).toBeLessThan(10);
    });
  });

  describe('fetchMarkets (mock)', () => {
    beforeEach(() => vi.stubEnv('NANSEN_MOCK', 'true'));
    it('returns mock data', async () => {
      const m = await fetchMarkets();
      expect(m.length).toBeGreaterThan(0);
      expect(m[0].marketId).toContain('mock');
    });
    it('includes ETH and LINK', async () => {
      const tokens = (await fetchMarkets()).map(m => m.token);
      expect(tokens).toContain('ETH');
      expect(tokens).toContain('LINK');
    });
    it('valid price ranges', async () => {
      for (const m of await fetchMarkets()) {
        expect(m.yesPrice).toBeGreaterThanOrEqual(0);
        expect(m.yesPrice).toBeLessThanOrEqual(1);
      }
    });
  });
});
