import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockProvider = {
  fetchNetflow: vi.fn(),
  fetchDexTrades: vi.fn(),
  fetchTokenScreener: vi.fn(),
  isMock: vi.fn(() => false),
};

vi.mock('../lib/providers/index.js', () => ({
  provider: () => mockProvider,
  initProvider: vi.fn(),
  registerProvider: vi.fn(),
  resetProvider: vi.fn(),
  CHAINS: ['ethereum', 'solana', 'base', 'bnb', 'hyperliquid'],
  get Provider() { return undefined; },
}));

vi.mock('../lib/providers/types.js', () => ({
  CHAINS: ['ethereum', 'solana', 'base', 'bnb', 'hyperliquid'],
}));

describe('scanner', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('scans a single chain and returns results', async () => {
    mockProvider.fetchNetflow.mockResolvedValue({ ok: true, data: { data: [{ symbol: 'ETH' }] } });
    mockProvider.fetchDexTrades.mockResolvedValue({ ok: true, data: { data: [{ symbol: 'ETH', side: 'buy' }] } });
    mockProvider.fetchTokenScreener.mockResolvedValue({ ok: true, data: { data: [{ symbol: 'ETH' }] } });

    const { scanChain } = await import('../lib/scanner.js');
    const result = await scanChain('ethereum');

    expect(result.chain).toBe('ethereum');
    expect(result.netflow).toEqual([{ symbol: 'ETH' }]);
    expect(result.dexTrades).toEqual([{ symbol: 'ETH', side: 'buy' }]);
    expect(result.topTokens).toEqual([{ symbol: 'ETH' }]);
  });

  it('returns empty arrays for failed responses', async () => {
    mockProvider.fetchNetflow.mockResolvedValue({ ok: false });
    mockProvider.fetchDexTrades.mockResolvedValue({ ok: false });
    mockProvider.fetchTokenScreener.mockResolvedValue({ ok: false });

    const { scanChain } = await import('../lib/scanner.js');
    const result = await scanChain('base');

    expect(result.netflow).toEqual([]);
    expect(result.dexTrades).toEqual([]);
    expect(result.topTokens).toEqual([]);
  });

  it('returns empty arrays when fetches reject', async () => {
    mockProvider.fetchNetflow.mockRejectedValue(new Error('fail'));
    mockProvider.fetchDexTrades.mockRejectedValue(new Error('fail'));
    mockProvider.fetchTokenScreener.mockRejectedValue(new Error('fail'));

    const { scanChain } = await import('../lib/scanner.js');
    const result = await scanChain('solana');

    expect(result.netflow).toEqual([]);
    expect(result.dexTrades).toEqual([]);
    expect(result.topTokens).toEqual([]);
  });

  it('calls fetchers with correct args', async () => {
    mockProvider.fetchNetflow.mockResolvedValue({ ok: true, data: { data: [] } });
    mockProvider.fetchDexTrades.mockResolvedValue({ ok: true, data: { data: [] } });
    mockProvider.fetchTokenScreener.mockResolvedValue({ ok: true, data: { data: [] } });

    const { scanChain } = await import('../lib/scanner.js');
    await scanChain('ethereum');

    expect(mockProvider.fetchNetflow).toHaveBeenCalledWith('ethereum', 20);
    expect(mockProvider.fetchDexTrades).toHaveBeenCalledWith('ethereum', 20);
    expect(mockProvider.fetchTokenScreener).toHaveBeenCalledWith('ethereum', '24h', 20);
  });

  it('scans all 5 chains by default', async () => {
    mockProvider.fetchNetflow.mockResolvedValue({ ok: true, data: { data: [] } });
    mockProvider.fetchDexTrades.mockResolvedValue({ ok: true, data: { data: [] } });
    mockProvider.fetchTokenScreener.mockResolvedValue({ ok: true, data: { data: [] } });

    const { scanAll } = await import('../lib/scanner.js');
    const results = await scanAll();

    expect(results).toHaveLength(5);
    expect(results[0]?.chain).toBe('ethereum');
    expect(mockProvider.fetchNetflow).toHaveBeenCalledTimes(5);
  });

  it('scans only specified chains', async () => {
    mockProvider.fetchNetflow.mockResolvedValue({ ok: true, data: { data: [] } });
    mockProvider.fetchDexTrades.mockResolvedValue({ ok: true, data: { data: [] } });
    mockProvider.fetchTokenScreener.mockResolvedValue({ ok: true, data: { data: [] } });

    const { scanAll } = await import('../lib/scanner.js');
    const results = await scanAll(['ethereum', 'base']);

    expect(results.map(r => r.chain)).toEqual(['ethereum', 'base']);
  });

  it('aggregates netflow and dex buys into accumulations', async () => {
    const { findAccumulations } = await import('../lib/scanner.js');
    const results = findAccumulations([
      {
        chain: 'ethereum',
        netflow: [{ symbol: 'ETH', address: '0xeth', net_flow_24h_usd: 1000, trader_count: 2 }],
        dexTrades: [{ token_bought_symbol: 'ETH', token_bought_address: '0xeth', trade_value_usd: 250 }],
        topTokens: [],
        scannedAt: 1,
      },
      {
        chain: 'base',
        netflow: [{ symbol: 'ETH', address: '0xeth', net_flow_24h_usd: 500, trader_count: 3 }],
        dexTrades: [{ token_bought_symbol: 'ETH', token_bought_address: '0xeth', trade_value_usd: 100 }],
        topTokens: [],
        scannedAt: 2,
      },
    ]);

    expect(results[0]).toMatchObject({
      symbol: 'ETH',
      chains: ['ethereum', 'base'],
      totalNetflow: 1500,
      totalBuyVolume: 350,
      smartMoneyBuyers: 7,
    });
  });

  it('includes negative netflow as valid signals', async () => {
    const { findAccumulations } = await import('../lib/scanner.js');
    const results = findAccumulations([
      {
        chain: 'ethereum',
        netflow: [{ symbol: 'ETH', address: '0xeth', net_flow_24h_usd: -100, trader_count: 2 }],
        dexTrades: [],
        topTokens: [],
        scannedAt: 1,
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]?.totalNetflow).toBe(-100);
  });

  it('sorts by chain count then absolute netflow', async () => {
    const { findAccumulations } = await import('../lib/scanner.js');
    const results = findAccumulations([
      {
        chain: 'ethereum',
        netflow: [{ symbol: 'AAA', address: 'aaa', net_flow_24h_usd: 100, trader_count: 1 }],
        dexTrades: [],
        topTokens: [],
        scannedAt: 1,
      },
      {
        chain: 'base',
        netflow: [
          { symbol: 'BBB', address: 'bbb', net_flow_24h_usd: 200, trader_count: 1 },
          { symbol: 'AAA', address: 'aaa', net_flow_24h_usd: 100, trader_count: 1 },
        ],
        dexTrades: [],
        topTokens: [],
        scannedAt: 2,
      },
    ]);

    expect(results.map(r => r.symbol)).toEqual(['AAA', 'BBB']);
  });

  it('falls back to 7d/30d flow when 24h is zero', async () => {
    const { findAccumulations } = await import('../lib/scanner.js');
    const results = findAccumulations([
      {
        chain: 'ethereum',
        netflow: [{ symbol: 'LINK', address: '0xlink', net_flow_24h_usd: 0, net_flow_7d_usd: 0, net_flow_30d_usd: 400, trader_count: 2 }],
        dexTrades: [],
        topTokens: [],
        scannedAt: 1,
      },
    ]);

    expect(results[0]).toMatchObject({ symbol: 'LINK', address: '0xlink', totalNetflow: 400 });
  });
});
