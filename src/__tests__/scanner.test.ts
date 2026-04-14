import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchNetflow = vi.fn();
const fetchDexTrades = vi.fn();
const fetchTokenScreener = vi.fn();

vi.mock('../lib/nansen.js', () => ({
  fetchNetflow,
  fetchDexTrades,
  fetchTokenScreener,
  CHAINS: ['ethereum', 'solana', 'base', 'arbitrum', 'polygon', 'optimism', 'avalanche', 'bnb'],
}));

describe('scanner', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('scans a single chain and returns results', async () => {
    fetchNetflow.mockResolvedValue({ ok: true, data: { data: [{ symbol: 'ETH' }] } });
    fetchDexTrades.mockResolvedValue({ ok: true, data: { data: [{ symbol: 'ETH', side: 'buy' }] } });
    fetchTokenScreener.mockResolvedValue({ ok: true, data: { data: [{ symbol: 'ETH' }] } });

    const { scanChain } = await import('../lib/scanner.js');
    const result = await scanChain('ethereum');

    expect(result.chain).toBe('ethereum');
    expect(result.netflow).toEqual([{ symbol: 'ETH' }]);
    expect(result.dexTrades).toEqual([{ symbol: 'ETH', side: 'buy' }]);
    expect(result.topTokens).toEqual([{ symbol: 'ETH' }]);
  });

  it('returns empty arrays for failed responses', async () => {
    fetchNetflow.mockResolvedValue({ ok: false });
    fetchDexTrades.mockResolvedValue({ ok: false });
    fetchTokenScreener.mockResolvedValue({ ok: false });

    const { scanChain } = await import('../lib/scanner.js');
    const result = await scanChain('base');

    expect(result.netflow).toEqual([]);
    expect(result.dexTrades).toEqual([]);
    expect(result.topTokens).toEqual([]);
  });

  it('returns empty arrays when fetches reject', async () => {
    fetchNetflow.mockRejectedValue(new Error('fail'));
    fetchDexTrades.mockRejectedValue(new Error('fail'));
    fetchTokenScreener.mockRejectedValue(new Error('fail'));

    const { scanChain } = await import('../lib/scanner.js');
    const result = await scanChain('solana');

    expect(result.netflow).toEqual([]);
    expect(result.dexTrades).toEqual([]);
    expect(result.topTokens).toEqual([]);
  });

  it('calls fetchers with correct args', async () => {
    fetchNetflow.mockResolvedValue({ ok: true, data: { data: [] } });
    fetchDexTrades.mockResolvedValue({ ok: true, data: { data: [] } });
    fetchTokenScreener.mockResolvedValue({ ok: true, data: { data: [] } });

    const { scanChain } = await import('../lib/scanner.js');
    await scanChain('arbitrum');

    expect(fetchNetflow).toHaveBeenCalledWith('arbitrum', 20);
    expect(fetchDexTrades).toHaveBeenCalledWith('arbitrum', 20);
    expect(fetchTokenScreener).toHaveBeenCalledWith('arbitrum', '24h', 20);
  });

  it('scans all 8 chains by default', async () => {
    fetchNetflow.mockResolvedValue({ ok: true, data: { data: [] } });
    fetchDexTrades.mockResolvedValue({ ok: true, data: { data: [] } });
    fetchTokenScreener.mockResolvedValue({ ok: true, data: { data: [] } });

    const { scanAll } = await import('../lib/scanner.js');
    const results = await scanAll();

    expect(results).toHaveLength(8);
    expect(results[0]?.chain).toBe('ethereum');
    expect(fetchNetflow).toHaveBeenCalledTimes(8);
  });

  it('scans only specified chains', async () => {
    fetchNetflow.mockResolvedValue({ ok: true, data: { data: [] } });
    fetchDexTrades.mockResolvedValue({ ok: true, data: { data: [] } });
    fetchTokenScreener.mockResolvedValue({ ok: true, data: { data: [] } });

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
