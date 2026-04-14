import { beforeEach, describe, expect, it, vi } from 'vitest';

const createCompletion = vi.fn();
const OpenAI = vi.fn(() => ({
  chat: { completions: { create: createCompletion } },
}));

vi.mock('openai', () => ({ default: OpenAI }));

describe('ai-analyzer', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    process.env.OPENROUTER_API_KEY = 'test-key';
    delete process.env.AI_MODEL;
  });

  const signal = {
    id: 'conv-eth-1', token: '0xeth', symbol: 'ETH',
    chains: ['ethereum', 'base'], score: 78,
    netflowUsd: 1_500_000, buyVolumeUsd: 400_000, smartMoneyBuyers: 7,
    classification: 'HIGH' as const, reason: 'Strong.', detectedAt: 1000,
  };

  const scans = [
    { chain: 'ethereum', netflow: [{ symbol: 'ETH' }], dexTrades: [{ symbol: 'ETH', side: 'buy' }], topTokens: [], scannedAt: 1 },
    { chain: 'base', netflow: [{ symbol: 'ETH' }], dexTrades: [{ symbol: 'ETH', side: 'buy' }], topTokens: [], scannedAt: 2 },
    { chain: 'solana', netflow: [{ symbol: 'SOL' }], dexTrades: [], topTokens: [], scannedAt: 3 },
  ];

  it('analyzes a signal using chat completions', async () => {
    createCompletion.mockResolvedValue({
      model: 'anthropic/claude-sonnet-4',
      choices: [{ message: { content: JSON.stringify({ thesis: 'ETH accumulation is broad-based.', conviction: 82, timeHorizon: '72h', risks: ['Volatility'], catalysts: ['ETF flows'], historicalPattern: 'Similar to prior breakouts' }) } }],
    });
    const { analyzeSignal } = await import('../lib/ai-analyzer.js');
    const result = await analyzeSignal(signal, scans);
    expect(result).toMatchObject({
      signalId: 'conv-eth-1', thesis: 'ETH accumulation is broad-based.',
      conviction: 82, timeHorizon: '72h', risks: ['Volatility'],
      catalysts: ['ETF flows'], historicalPattern: 'Similar to prior breakouts',
      model: 'anthropic/claude-sonnet-4',
    });
  });

  it('builds client with OpenRouter settings', async () => {
    createCompletion.mockResolvedValue({ model: 'm', choices: [{ message: { content: '{}' } }] });
    const { analyzeSignal } = await import('../lib/ai-analyzer.js');
    await analyzeSignal(signal, scans);
    expect(OpenAI).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: 'test-key',
      defaultHeaders: expect.objectContaining({ 'X-Title': 'Hyper Compass' }),
    }));
  });

  it('uses AI_MODEL env var', async () => {
    process.env.AI_MODEL = 'custom/model';
    createCompletion.mockResolvedValue({ model: 'custom/model', choices: [{ message: { content: '{}' } }] });
    const { analyzeSignal } = await import('../lib/ai-analyzer.js');
    await analyzeSignal(signal, scans);
    expect(createCompletion).toHaveBeenCalledWith(expect.objectContaining({ model: 'custom/model' }));
  });

  it('passes only relevant chains', async () => {
    createCompletion.mockResolvedValue({ model: 'm', choices: [{ message: { content: '{}' } }] });
    const { analyzeSignal } = await import('../lib/ai-analyzer.js');
    await analyzeSignal(signal, scans);
    const userMsg = createCompletion.mock.calls[0][0].messages[1].content as string;
    expect(userMsg).toContain('ethereum:');
    expect(userMsg).toContain('base:');
    expect(userMsg).not.toContain('solana:');
  });

  it('strips markdown fences', async () => {
    createCompletion.mockResolvedValue({
      model: 'm',
      choices: [{ message: { content: '```json\n{"thesis":"Fenced","conviction":70,"timeHorizon":"24h","risks":["r"],"catalysts":["c"],"historicalPattern":"hp"}\n```' } }],
    });
    const { analyzeSignal } = await import('../lib/ai-analyzer.js');
    const result = await analyzeSignal(signal, scans);
    expect(result.thesis).toBe('Fenced');
    expect(result.conviction).toBe(70);
  });

  it('falls back for unparseable output', async () => {
    createCompletion.mockResolvedValue({
      model: 'm', choices: [{ message: { content: 'Unstructured analysis text' } }],
    });
    const { analyzeSignal } = await import('../lib/ai-analyzer.js');
    const result = await analyzeSignal(signal, scans);
    expect(result.thesis).toContain('Unstructured analysis text');
    expect(result.conviction).toBe(50);
    expect(result.risks).toContain('Failed to parse structured output');
  });

  it('clamps conviction to 0-100', async () => {
    createCompletion.mockResolvedValue({
      model: 'm', choices: [{ message: { content: '{"thesis":"A","conviction":120,"timeHorizon":"24h","risks":[],"catalysts":[],"historicalPattern":"x"}' } }],
    });
    const { analyzeSignal } = await import('../lib/ai-analyzer.js');
    expect((await analyzeSignal(signal, scans)).conviction).toBe(100);
  });

  it('throws when API key missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const { analyzeSignal } = await import('../lib/ai-analyzer.js');
    await expect(analyzeSignal(signal, scans)).rejects.toThrow('OPENROUTER_API_KEY not set');
  });

  it('analyzes batches and skips failures', async () => {
    createCompletion
      .mockResolvedValueOnce({ model: 'm', choices: [{ message: { content: '{"thesis":"A","conviction":60,"timeHorizon":"24h","risks":[],"catalysts":[],"historicalPattern":"x"}' } }] })
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ model: 'm', choices: [{ message: { content: '{"thesis":"C","conviction":70,"timeHorizon":"1w","risks":[],"catalysts":[],"historicalPattern":"z"}' } }] });
    const { analyzeBatch } = await import('../lib/ai-analyzer.js');
    const results = await analyzeBatch([signal, { ...signal, id: 'conv-2' }, { ...signal, id: 'conv-3' }], scans, 2);
    expect(results).toHaveLength(2);
    expect(results.map(r => r.thesis)).toEqual(['A', 'C']);
  });

  it('returns mock analysis', async () => {
    const { getMockAnalysis } = await import('../lib/ai-analyzer.js');
    const result = getMockAnalysis(signal);
    expect(result.model).toBe('mock');
    expect(result.signalId).toBe('conv-eth-1');
    expect(result.thesis).toContain('ETH');
    expect(result.catalysts.length).toBeGreaterThan(0);
  });
});
