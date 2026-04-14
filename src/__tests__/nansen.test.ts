import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockExecFile = vi.fn();
const mockRecord = vi.fn();
const mockClassifyRole = vi.fn((cmd: string) => `role:${cmd}`);
const mockGetMockData = vi.fn();

vi.mock('node:child_process', () => ({
  execFile: mockExecFile,
}));

vi.mock('../lib/telemetry.ts', () => ({
  record: mockRecord,
  classifyRole: mockClassifyRole,
}));

vi.mock('../lib/mock.ts', () => ({
  getMockData: mockGetMockData,
}));

describe('nansen', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.NANSEN_MOCK;
  });

  afterEach(() => {
    delete process.env.NANSEN_MOCK;
  });

  it('reports mock mode when NANSEN_MOCK=true', async () => {
    process.env.NANSEN_MOCK = 'true';
    const { isMock } = await import('../lib/nansen.ts');
    expect(isMock()).toBe(true);
  });

  it('reports non-mock mode by default', async () => {
    const { isMock } = await import('../lib/nansen.ts');
    expect(isMock()).toBe(false);
  });

  it('returns mock data in mock mode', async () => {
    process.env.NANSEN_MOCK = 'true';
    mockGetMockData.mockReturnValue([{ symbol: 'ETH' }]);
    const { run } = await import('../lib/nansen.ts');

    const result = await run('research smart-money netflow', ['--chain', 'ethereum']);
    expect(result).toEqual({ ok: true, data: { data: [{ symbol: 'ETH' }] } });
    expect(mockGetMockData).toHaveBeenCalledWith('research smart-money netflow', ['--chain', 'ethereum']);
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it('records telemetry for mock calls', async () => {
    process.env.NANSEN_MOCK = 'true';
    mockGetMockData.mockReturnValue([]);
    const { run } = await import('../lib/nansen.ts');

    await run('research smart-money netflow', ['--chain', 'base']);

    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: 'research smart-money netflow',
      status: 'MOCK',
      cacheStatus: 'N/A',
      chain: 'base',
    }));
  });

  it('executes the CLI with split command + --json in real mode', async () => {
    mockExecFile.mockImplementation((_bin: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, JSON.stringify({ ok: true, data: { data: [{ symbol: 'ETH' }] } }), '');
    });
    const { run } = await import('../lib/nansen.ts');

    const result = await run('research smart-money netflow', ['--chain', 'ethereum', '--limit', '10']);
    expect(result.ok).toBe(true);
    expect(mockExecFile).toHaveBeenCalledWith(
      'nansen',
      ['research', 'smart-money', 'netflow', '--chain', 'ethereum', '--limit', '10', '--json'],
      { maxBuffer: 10 * 1024 * 1024, timeout: 30_000 },
      expect.any(Function),
    );
  });

  it('caches successful real responses', async () => {
    mockExecFile.mockImplementation((_bin: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, JSON.stringify({ ok: true, data: { data: [{ symbol: 'ETH' }] } }), '');
    });
    const { run } = await import('../lib/nansen.ts');

    const first = await run('research smart-money netflow', ['--chain', 'ethereum']);
    const second = await run('research smart-money netflow', ['--chain', 'ethereum']);

    expect(first).toEqual(second);
    expect(mockExecFile).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenLastCalledWith(expect.objectContaining({
      status: 'CACHED',
      cacheStatus: 'HIT',
    }));
  });

  it('handles JSON error from stderr', async () => {
    mockExecFile.mockImplementation((_bin: string, _args: string[], _opts: any, cb: Function) => {
      cb(new Error('failed'), '', JSON.stringify({ error: 'bad request', code: 'BAD_REQ' }));
    });
    const { run } = await import('../lib/nansen.ts');

    await expect(run('research token info', ['--chain', 'ethereum'])).resolves.toEqual({
      ok: false,
      error: 'bad request',
      code: 'BAD_REQ',
    });
  });

  it('handles non-JSON error output', async () => {
    mockExecFile.mockImplementation((_bin: string, _args: string[], _opts: any, cb: Function) => {
      cb(new Error('exec failed'), '', 'plain stderr');
    });
    const { run } = await import('../lib/nansen.ts');

    await expect(run('research token info', ['--chain', 'ethereum'])).resolves.toEqual({
      ok: false,
      error: 'plain stderr',
      code: 'EXEC_ERROR',
    });
  });

  it('handles invalid JSON in success output', async () => {
    mockExecFile.mockImplementation((_bin: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, 'not-json', '');
    });
    const { run } = await import('../lib/nansen.ts');

    const result = await run('research token info', ['--chain', 'ethereum']);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('PARSE_ERROR');
    expect(result.error).toContain('Failed to parse: not-json');
  });

  it('records telemetry for successful real calls', async () => {
    mockExecFile.mockImplementation((_bin: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, JSON.stringify({ ok: true, data: { data: [] } }), '');
    });
    const { run } = await import('../lib/nansen.ts');

    await run('research token info', ['--chain', 'solana']);

    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: 'research token info',
      status: '200',
      cacheStatus: 'MISS',
      chain: 'solana',
    }));
  });

  it('exposes the supported chains list', async () => {
    const { CHAINS } = await import('../lib/nansen.ts');
    expect(CHAINS).toEqual([
      'ethereum', 'solana', 'base', 'arbitrum', 'polygon',
      'optimism', 'avalanche', 'bnb',
    ]);
  });

  it('fetchNetflow sends correct command with default limit', async () => {
    mockExecFile.mockImplementation((_bin: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, JSON.stringify({ ok: true, data: { data: [] } }), '');
    });
    const { fetchNetflow } = await import('../lib/nansen.ts');
    await fetchNetflow('ethereum');
    expect(mockExecFile).toHaveBeenCalledWith(
      'nansen',
      ['research', 'smart-money', 'netflow', '--chain', 'ethereum', '--limit', '10', '--json'],
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('fetchTokenScreener sends timeframe and limit', async () => {
    mockExecFile.mockImplementation((_bin: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, JSON.stringify({ ok: true, data: { data: [] } }), '');
    });
    const { fetchTokenScreener } = await import('../lib/nansen.ts');
    await fetchTokenScreener('base', '7d', 5);
    expect(mockExecFile).toHaveBeenCalledWith(
      'nansen',
      ['research', 'token', 'screener', '--chain', 'base', '--timeframe', '7d', '--limit', '5', '--json'],
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('fetchTradeQuote sends asset arguments', async () => {
    mockExecFile.mockImplementation((_bin: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, JSON.stringify({ ok: true, data: { data: [] } }), '');
    });
    const { fetchTradeQuote } = await import('../lib/nansen.ts');
    await fetchTradeQuote('ethereum', 'ETH', 'USDC', '1');
    expect(mockExecFile).toHaveBeenCalledWith(
      'nansen',
      ['trade', 'quote', '--chain', 'ethereum', '--from', 'ETH', '--to', 'USDC', '--amount', '1', '--json'],
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('fetchAccount sends no extra args', async () => {
    mockExecFile.mockImplementation((_bin: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, JSON.stringify({ ok: true, data: { data: [] } }), '');
    });
    const { fetchAccount } = await import('../lib/nansen.ts');
    await fetchAccount();
    expect(mockExecFile).toHaveBeenCalledWith(
      'nansen',
      ['account', '--json'],
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('fetchTokenInfo extracts chain for telemetry', async () => {
    mockExecFile.mockImplementation((_bin: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, JSON.stringify({ ok: true, data: { data: [] } }), '');
    });
    const { fetchTokenInfo } = await import('../lib/nansen.ts');
    await fetchTokenInfo('base', 'ETH');
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ chain: 'base' }));
  });
});
