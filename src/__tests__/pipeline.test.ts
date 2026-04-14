import { describe, it, expect } from 'vitest';
import { fmt, pct, scoreToken, assessRisk, type TokenSignal } from '../alpha-pipeline.js';

function token(overrides: Partial<TokenSignal> = {}): TokenSignal {
  return {
    chain: 'ethereum', address: '0xeth', symbol: 'ETH',
    netflow: 500_000, volume: 5_000_000, priceChange: 0.05,
    marketCap: 100_000_000, buyVolume: 3_000_000, sellVolume: 2_000_000,
    liquidity: 5_000_000, score: 0,
    ...overrides,
  };
}

describe('pipeline utils', () => {
  describe('fmt', () => {
    it('formats billions', () => expect(fmt(1_500_000_000)).toBe('1.50B'));
    it('formats millions', () => expect(fmt(2_500_000)).toBe('2.50M'));
    it('formats thousands', () => expect(fmt(3_500)).toBe('3.5K'));
    it('formats small numbers', () => expect(fmt(42)).toBe('42.00'));
    it('handles negative', () => expect(fmt(-1_200_000)).toBe('-1.20M'));
  });

  describe('pct', () => {
    it('formats percentage', () => expect(pct(0.1234)).toBe('12.34%'));
    it('handles zero', () => expect(pct(0)).toBe('0.00%'));
  });

  describe('scoreToken', () => {
    it('scores positive netflow', () => {
      const s = scoreToken(token());
      expect(s).toBeGreaterThan(0);
    });

    it('scores zero netflow lower', () => {
      const high = scoreToken(token({ netflow: 2_000_000 }));
      const low = scoreToken(token({ netflow: 0 }));
      expect(high).toBeGreaterThan(low);
    });

    it('rewards buy > sell', () => {
      const buy = scoreToken(token({ buyVolume: 5_000_000, sellVolume: 1_000_000 }));
      const sell = scoreToken(token({ buyVolume: 1_000_000, sellVolume: 5_000_000 }));
      expect(buy).toBeGreaterThan(sell);
    });

    it('rewards mid-cap', () => {
      const mid = scoreToken(token({ marketCap: 100_000_000 }));
      const large = scoreToken(token({ marketCap: 10_000_000_000 }));
      expect(mid).toBeGreaterThan(large);
    });
  });

  describe('assessRisk', () => {
    it('returns grade A for strong signal', () => {
      const r = assessRisk(token({ netflow: 2_000_000, liquidity: 10_000_000, buyVolume: 8_000_000, sellVolume: 2_000_000 }), null, 4, 5);
      expect(r.grade).toBe('A');
      expect(r.gateOpen).toBe(true);
    });

    it('returns F for weak signal', () => {
      const r = assessRisk(token({ netflow: -100, liquidity: 100_000, buyVolume: 0, sellVolume: 100, priceChange: -0.5, marketCap: 1_000 }), null, 0, 0);
      expect(r.gateOpen).toBe(false);
    });

    it('has 8 risk factors', () => {
      const r = assessRisk(token(), null, 1, 0);
      expect(r.factors).toHaveLength(8);
    });

    it('each factor has name, value, weight, pass', () => {
      const r = assessRisk(token(), null, 1, 0);
      for (const f of r.factors) {
        expect(f).toHaveProperty('name');
        expect(f).toHaveProperty('value');
        expect(f).toHaveProperty('weight');
        expect(f).toHaveProperty('pass');
      }
    });

    it('score is normalized', () => {
      const r = assessRisk(token(), null, 2, 3);
      expect(r.score).toBeGreaterThan(0);
      expect(r.score).toBeLessThanOrEqual(10);
    });
  });
});
