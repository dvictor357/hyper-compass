import { execFile } from 'node:child_process';
import { record, classifyRole } from './telemetry.js';
import { TTLCache } from './cache.js';

export interface NansenResult<T = unknown> {
  ok: boolean;
  data?: { data: T; pagination?: { total: number; page: number; limit: number } };
  error?: string;
  code?: string;
}

const MOCK_MODE = process.env.NANSEN_MOCK === 'true';
const responseCache = new TTLCache<string>(60_000);

export function isMock(): boolean {
  return MOCK_MODE;
}

function extractChain(args: string[]): string | undefined {
  return args.find((_, i) => args[i - 1] === '--chain');
}

export async function run<T = unknown>(
  command: string,
  args: string[] = [],
): Promise<NansenResult<T>> {
  const cacheKey = `${command}|${args.join('|')}`;
  const t0 = Date.now();
  const chain = extractChain(args);

  const cached = responseCache.get(cacheKey);
  if (cached !== undefined) {
    record({
      endpoint: command,
      method: 'EXEC',
      latencyMs: 0,
      status: 'CACHED',
      cacheStatus: 'HIT',
      role: classifyRole(command),
      chain,
    });
    return JSON.parse(cached) as NansenResult<T>;
  }

  if (MOCK_MODE) {
    const { getMockData } = await import('./mock.js');
    const mockPayload = getMockData(command, args);
    record({
      endpoint: command,
      method: 'EXEC',
      latencyMs: 50,
      status: 'MOCK',
      cacheStatus: 'N/A',
      role: classifyRole(command),
      chain,
    });
    return { ok: true, data: { data: mockPayload as T } };
  }

  return new Promise((resolve) => {
    const cliArgs = [...command.split(' '), ...args, '--json'];

    execFile('nansen', cliArgs, { maxBuffer: 10 * 1024 * 1024, timeout: 30_000 }, (err, stdout, stderr) => {
      const latency = Date.now() - t0;

      if (err) {
        const output = stderr || stdout || err.message;
        record({ endpoint: command, method: 'EXEC', latencyMs: latency, status: 'ERROR', cacheStatus: 'MISS', role: classifyRole(command), chain });
        try {
          const parsed = JSON.parse(output);
          resolve({ ok: false, error: parsed.error || err.message, code: parsed.code });
        } catch {
          resolve({ ok: false, error: output, code: 'EXEC_ERROR' });
        }
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as NansenResult<T>;
        responseCache.put(cacheKey, stdout);
        record({ endpoint: command, method: 'EXEC', latencyMs: latency, status: '200', cacheStatus: 'MISS', role: classifyRole(command), chain });
        resolve(parsed);
      } catch {
        record({ endpoint: command, method: 'EXEC', latencyMs: latency, status: 'PARSE_ERROR', cacheStatus: 'MISS', role: classifyRole(command), chain });
        resolve({ ok: false, error: `Failed to parse: ${stdout.slice(0, 200)}`, code: 'PARSE_ERROR' });
      }
    });
  });
}

export const CHAINS = [
  'ethereum', 'solana', 'base', 'arbitrum', 'polygon',
  'optimism', 'avalanche', 'bnb',
] as const;

export type Chain = typeof CHAINS[number];

export const fetchNetflow = (chain: Chain, limit = 10) =>
  run('research smart-money netflow', ['--chain', chain, '--limit', String(limit)]);

export const fetchDexTrades = (chain: Chain, limit = 10) =>
  run('research smart-money dex-trades', ['--chain', chain, '--limit', String(limit)]);

export const fetchPerpTrades = (chain: Chain, limit = 10) =>
  run('research smart-money perp-trades', ['--chain', chain, '--limit', String(limit)]);

export const fetchHoldings = (chain: Chain, limit = 10) =>
  run('research smart-money holdings', ['--chain', chain, '--limit', String(limit)]);

export const fetchDCAs = (chain: Chain, limit = 10) =>
  run('research smart-money dcas', ['--chain', chain, '--limit', String(limit)]);

export const fetchTokenInfo = (chain: Chain, token: string) =>
  run('research token info', ['--chain', chain, '--token', token]);

export const fetchTokenScreener = (chain: Chain, timeframe = '24h', limit = 20) =>
  run('research token screener', ['--chain', chain, '--timeframe', timeframe, '--limit', String(limit)]);

export const fetchTokenFlows = (chain: Chain, token: string) =>
  run('research token flows', ['--chain', chain, '--token', token]);

export const fetchTokenHolders = (chain: Chain, token: string, limit = 20) =>
  run('research token holders', ['--chain', chain, '--token', token, '--limit', String(limit)]);

export const fetchWhoBoughtSold = (chain: Chain, token: string) =>
  run('research token who-bought-sold', ['--chain', chain, '--token', token]);

export const fetchFlowIntelligence = (chain: Chain, token: string) =>
  run('research token flow-intelligence', ['--chain', chain, '--token', token]);

export const fetchTokenIndicators = (chain: Chain, token: string) =>
  run('research token indicators', ['--chain', chain, '--token', token]);

export const fetchProfilerLabels = (address: string, chain: Chain) =>
  run('research profiler labels', ['--address', address, '--chain', chain]);

export const fetchProfilerPnl = (address: string, chain: Chain) =>
  run('research profiler pnl-summary', ['--address', address, '--chain', chain]);

export const fetchProfilerBalance = (address: string, chain: Chain) =>
  run('research profiler balance', ['--address', address, '--chain', chain]);

export const fetchProfilerCounterparties = (address: string, chain: Chain, limit = 10) =>
  run('research profiler counterparties', ['--address', address, '--chain', chain, '--limit', String(limit)]);

export const fetchProfilerRelatedWallets = (address: string, chain: Chain) =>
  run('research profiler related-wallets', ['--address', address, '--chain', chain]);

export const fetchProfilerTrace = (address: string, chain: Chain, depth = 2, width = 5) =>
  run('research profiler trace', ['--address', address, '--chain', chain, '--depth', String(depth), '--width', String(width), '--delay', '500']);

export const fetchProfilerCompare = (addresses: string, chain: Chain) =>
  run('research profiler compare', ['--addresses', addresses, '--chain', chain]);

export const fetchProfilerTransactions = (address: string, chain: Chain, days = 7) =>
  run('research profiler transactions', ['--address', address, '--chain', chain, '--days', String(days)]);

export const fetchProfilerHistoricalBalances = (address: string, chain: Chain, days = 30) =>
  run('research profiler historical-balances', ['--address', address, '--chain', chain, '--days', String(days)]);

export const fetchProfilerSearch = (query: string) =>
  run('research profiler search', ['--query', query]);

export const fetchTokenPnl = (chain: Chain, token: string, days = 30) =>
  run('research token pnl', ['--chain', chain, '--token', token, '--days', String(days)]);

export const fetchTokenDexTrades = (chain: Chain, token: string, days = 7) =>
  run('research token dex-trades', ['--chain', chain, '--token', token, '--days', String(days)]);

export const fetchTokenOhlcv = (chain: Chain, token: string) =>
  run('research token ohlcv', ['--chain', chain, '--token', token]);

export const fetchTokenPerpPositions = (symbol: string) =>
  run('research token perp-positions', ['--symbol', symbol]);

export const fetchTokenJupDca = (token: string) =>
  run('research token jup-dca', ['--token', token]);

export const fetchPortfolioDefi = (wallet: string) =>
  run('research portfolio defi', ['--wallet', wallet]);

export const fetchNansenAgent = (question: string, expert = false) =>
  run('agent', [question, ...(expert ? ['--expert'] : [])]);

export const fetchAlertsList = () => run('alerts list', []);

export const fetchAlertsCreate = (name: string, type: string, chains: string, options: string[] = []) =>
  run('alerts create', ['--name', name, '--type', type, '--chains', chains, ...options]);

export const fetchSearch = (query: string) =>
  run('research search', ['--query', query]);

export const fetchPredictionMarketScreener = () =>
  run('research prediction-market market-screener', []);

export const fetchTradeQuote = (chain: string, from: string, to: string, amount: string) =>
  run('trade quote', ['--chain', chain, '--from', from, '--to', to, '--amount', amount]);

export const fetchTradeExecute = (quoteId: string, wallet?: string) =>
  run('trade execute', ['--quote', quoteId, ...(wallet ? ['--wallet', wallet] : [])]);

export const fetchAccount = () => run('account', []);

export const fetchWalletList = () => run('wallet list', []);

export const fetchWalletCreate = (name: string) =>
  run('wallet create', ['--name', name]);

export const fetchWalletShow = (name?: string) =>
  run('wallet show', name ? ['--name', name] : []);

export const fetchHistoricalHoldings = (chain: Chain, limit = 5) =>
  run('research smart-money historical-holdings', ['--chain', chain, '--limit', String(limit)]);

export const fetchPerpScreener = (days = 30) =>
  run('research perp screener', ['--days', String(days)]);

export const fetchPerpLeaderboard = (days = 30) =>
  run('research perp leaderboard', ['--days', String(days)]);

export const fetchSmPerpTrades = (chain: Chain, limit = 10) =>
  run('research smart-money perp-trades', ['--chain', chain, '--limit', String(limit)]);

export const fetchSmDCAs = (chain: Chain, limit = 10) =>
  run('research smart-money dcas', ['--chain', chain, '--limit', String(limit)]);
