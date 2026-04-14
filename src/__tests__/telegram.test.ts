import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatAlert, sendAlert, broadcastAlert,
  updateScanStatus, getSubscriberCount, getSubscribers,
  type AlertMessage,
} from '../lib/telegram.js';

function alert(overrides: Partial<AlertMessage> = {}): AlertMessage {
  return {
    type: 'divergence', title: 'ETH Divergence Detected',
    body: 'Smart money accumulating while crowd is bearish.',
    conviction: 78, tokens: ['ETH'], chains: ['ethereum', 'base'],
    ...overrides,
  };
}

describe('telegram', () => {
  beforeEach(() => vi.stubEnv('NANSEN_MOCK', 'true'));
  afterEach(() => vi.unstubAllEnvs());

  describe('formatAlert', () => {
    it('includes title', () => expect(formatAlert(alert())).toContain('ETH Divergence Detected'));
    it('includes body', () => expect(formatAlert(alert())).toContain('Smart money accumulating'));
    it('includes conviction score', () => expect(formatAlert(alert({ conviction: 92 }))).toContain('92/100'));
    it('includes tokens', () => expect(formatAlert(alert({ tokens: ['ETH', 'BTC'] }))).toContain('ETH, BTC'));
    it('includes chains', () => expect(formatAlert(alert({ chains: ['ethereum', 'solana'] }))).toContain('ethereum, solana'));
    it('warning emoji for divergence', () => expect(formatAlert(alert({ type: 'divergence' }))).toContain('\u{26A0}'));
    it('alert emoji for syndicate', () => expect(formatAlert(alert({ type: 'syndicate' }))).toContain('\u{1F6A8}'));
    it('checkmark for convergence', () => expect(formatAlert(alert({ type: 'convergence' }))).toContain('\u{2705}'));
    it('conviction bar', () => {
      const f = formatAlert(alert({ conviction: 70 }));
      expect(f).toContain('\u{2588}'.repeat(7));
      expect(f).toContain('\u{2591}'.repeat(3));
    });
    it('includes signature', () => expect(formatAlert(alert())).toContain('Hyper Compass'));
    it('handles empty tokens/chains', () => {
      const f = formatAlert(alert({ tokens: [], chains: [] }));
      expect(f).toContain('Tokens');
      expect(f).toContain('Chains');
    });
  });

  describe('sendAlert', () => {
    it('logs in mock mode', async () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await sendAlert('12345', alert());
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[TELEGRAM] Alert to 12345'));
      spy.mockRestore();
    });
  });

  describe('broadcastAlert', () => {
    it('returns 0 with no subscribers', async () => {
      expect(await broadcastAlert(alert())).toBe(0);
    });
  });

  describe('updateScanStatus', () => {
    it('does not throw', () => expect(() => updateScanStatus('Found 3 signals')).not.toThrow());
  });

  describe('getSubscriberCount', () => {
    it('returns number', () => expect(typeof getSubscriberCount()).toBe('number'));
  });

  describe('getSubscribers', () => {
    it('returns array', () => expect(Array.isArray(getSubscribers())).toBe(true));
  });
});
