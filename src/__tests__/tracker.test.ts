import { beforeEach, describe, expect, it, vi } from 'vitest';

const writeFile = vi.fn();
const readFile = vi.fn();
const mkdir = vi.fn();
const fetchTokenInfo = vi.fn();

const mockProvider = {
  fetchTokenInfo,
  isMock: () => false,
};

vi.mock('node:fs/promises', () => ({ writeFile, readFile, mkdir }));
vi.mock('../lib/providers/index.js', () => ({
  provider: () => mockProvider,
  initProvider: vi.fn(),
  registerProvider: vi.fn(),
  resetProvider: vi.fn(),
}));

describe('tracker', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-04T00:00:00.000Z'));
    mkdir.mockResolvedValue(undefined);
    writeFile.mockResolvedValue(undefined);
  });

  async function load() { return import('../lib/tracker.js'); }

  function sig(overrides: Record<string, unknown> = {}) {
    return {
      id: 'signal-eth-1', symbol: 'ETH', chains: ['ethereum'],
      convergenceScore: 80, aiConviction: 70, compositeScore: 76,
      classification: 'STRONG_BUY', thesis: 'ETH thesis',
      risks: ['risk'], catalysts: ['cat'], timeHorizon: '72h',
      historicalPattern: 'pattern', netflowUsd: 1_000_000,
      buyVolumeUsd: 200_000, smartMoneyBuyers: 5,
      detectedAt: Date.now() - 80 * 60 * 60 * 1000,
      analyzedAt: Date.now() - 79 * 60 * 60 * 1000,
      ...overrides,
    };
  }

  it('loads history from disk', async () => {
    readFile.mockResolvedValue(JSON.stringify([{ id: 'stored', outcome: 'WIN' }]));
    const t = await load();
    await t.loadHistory();
    expect(t.getHistory()).toEqual([{ id: 'stored', outcome: 'WIN' }]);
  });

  it('falls back to empty', async () => {
    readFile.mockRejectedValue(new Error('missing'));
    const t = await load();
    await t.loadHistory();
    expect(t.getHistory()).toEqual([]);
  });

  it('saves history to disk', async () => {
    readFile.mockResolvedValue('[]');
    fetchTokenInfo.mockResolvedValue({ ok: true, data: { data: { price_usd: '100' } } });
    const t = await load();
    await t.loadHistory();
    await t.trackSignal(sig());
    expect(mkdir).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('signal-history.json'), expect.any(String));
  });

  it('tracks with PENDING outcome and price', async () => {
    readFile.mockResolvedValue('[]');
    fetchTokenInfo.mockResolvedValue({ ok: true, data: { data: { price_usd: '100' } } });
    const t = await load();
    await t.loadHistory();
    const tracked = await t.trackSignal(sig());
    expect(tracked.outcome).toBe('PENDING');
    expect(tracked.priceAtDetection).toBe(100);
    expect(t.getHistory()).toHaveLength(1);
  });

  it('continues without price on fetch failure', async () => {
    readFile.mockResolvedValue('[]');
    fetchTokenInfo.mockRejectedValue(new Error('down'));
    const t = await load();
    await t.loadHistory();
    const tracked = await t.trackSignal(sig());
    expect(tracked.priceAtDetection).toBeUndefined();
    expect(tracked.outcome).toBe('PENDING');
  });

  it('uses first chain for price fetch', async () => {
    readFile.mockResolvedValue('[]');
    fetchTokenInfo.mockResolvedValue({ ok: true, data: { data: { price_usd: '100' } } });
    const t = await load();
    await t.loadHistory();
    await t.trackSignal(sig({ chains: ['base', 'ethereum'] }));
    expect(fetchTokenInfo).toHaveBeenCalledWith('base', 'ETH');
  });

  it('updates 24h + 72h and marks WIN', async () => {
    readFile.mockResolvedValue('[]');
    fetchTokenInfo
      .mockResolvedValueOnce({ ok: true, data: { data: { price_usd: '100' } } })
      .mockResolvedValueOnce({ ok: true, data: { data: { price_usd: '120' } } })
      .mockResolvedValueOnce({ ok: true, data: { data: { price_usd: '130' } } });
    const t = await load();
    await t.loadHistory();
    await t.trackSignal(sig());
    const updated = await t.checkPerformance();
    const [stored] = t.getHistory();
    expect(updated).toBe(3);
    expect(stored.priceAfter24h).toBe(120);
    expect(stored.returnPct24h).toBe(20);
    expect(stored.priceAfter72h).toBe(130);
    expect(stored.returnPct72h).toBe(30);
    expect(stored.outcome).toBe('WIN');
  });

  it('marks LOSS on negative 72h return', async () => {
    readFile.mockResolvedValue('[]');
    fetchTokenInfo
      .mockResolvedValueOnce({ ok: true, data: { data: { price_usd: '100' } } })
      .mockResolvedValueOnce({ ok: true, data: { data: { price_usd: '95' } } })
      .mockResolvedValueOnce({ ok: true, data: { data: { price_usd: '80' } } });
    const t = await load();
    await t.loadHistory();
    await t.trackSignal(sig());
    await t.checkPerformance();
    expect(t.getHistory()[0]?.outcome).toBe('LOSS');
  });

  it('skips without detection price', async () => {
    readFile.mockResolvedValue('[]');
    fetchTokenInfo.mockRejectedValue(new Error('no'));
    const t = await load();
    await t.loadHistory();
    await t.trackSignal(sig());
    expect(await t.checkPerformance()).toBe(0);
  });

  it('zeroed stats for empty', async () => {
    readFile.mockResolvedValue('[]');
    const t = await load();
    await t.loadHistory();
    expect(t.getStats()).toEqual({
      totalSignals: 0, resolved: 0, pending: 0, wins: 0, losses: 0,
      winRate: 0, avgReturn24h: 0, avgReturn72h: 0, strongBuyWinRate: 0, buyWinRate: 0,
    });
  });

  it('computes aggregate stats', async () => {
    readFile.mockResolvedValue(JSON.stringify([
      { ...sig({ id: 'a', classification: 'STRONG_BUY' }), outcome: 'WIN', returnPct24h: 10, returnPct72h: 15 },
      { ...sig({ id: 'b', classification: 'BUY' }), outcome: 'LOSS', returnPct24h: -5, returnPct72h: -10 },
      { ...sig({ id: 'c', classification: 'BUY' }), outcome: 'PENDING' },
    ]));
    const t = await load();
    await t.loadHistory();
    expect(t.getStats()).toEqual({
      totalSignals: 3, resolved: 2, pending: 1, wins: 1, losses: 1,
      winRate: 50, avgReturn24h: 2.5, avgReturn72h: 2.5, strongBuyWinRate: 100, buyWinRate: 0,
    });
  });

  it('returns recent signals', async () => {
    readFile.mockResolvedValue(JSON.stringify([
      sig({ id: 'recent', detectedAt: Date.now() - 2 * 60 * 60 * 1000 }),
      sig({ id: 'old', detectedAt: Date.now() - 30 * 60 * 60 * 1000 }),
    ]));
    const t = await load();
    await t.loadHistory();
    expect(t.getRecent(24).map(s => s.id)).toEqual(['recent']);
  });
});
