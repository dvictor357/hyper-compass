import { execFile } from 'node:child_process';
import { record, classifyRole } from '../telemetry.js';
import { TTLCache } from '../cache.js';
import { CHAINS, type Chain, type ProviderResult, type DataSourceProvider } from './types.js';

export const NANSEN_CHAINS = [
  'ethereum', 'solana', 'base', 'arbitrum', 'polygon',
  'optimism', 'avalanche', 'bnb',
] as const;
export type NansenChain = typeof NANSEN_CHAINS[number];

const MOCK_MODE = process.env.NANSEN_MOCK === 'true';
const responseCache = new TTLCache<string>(60_000);

function extractChain(args: string[]): string | undefined {
  return args.find((_, i) => args[i - 1] === '--chain');
}

async function nansenRun<T = unknown>(
  command: string,
  args: string[] = [],
): Promise<ProviderResult<T>> {
  const cacheKey = `${command}|${args.join('|')}`;
  const t0 = Date.now();
  const chain = extractChain(args);

  const cached = responseCache.get(cacheKey);
  if (cached !== undefined) {
    record({
      endpoint: command, method: 'EXEC', latencyMs: 0,
      status: 'CACHED', cacheStatus: 'HIT', role: classifyRole(command), chain,
    });
    return JSON.parse(cached) as ProviderResult<T>;
  }

  if (MOCK_MODE) {
    const { getMockData } = await import('../mock.js');
    const mockPayload = getMockData(command, args);
    record({
      endpoint: command, method: 'EXEC', latencyMs: 50,
      status: 'MOCK', cacheStatus: 'N/A', role: classifyRole(command), chain,
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
        const parsed = JSON.parse(stdout) as ProviderResult<T>;
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

export class NansenProvider implements DataSourceProvider {
  name = 'nansen';

  isMock(): boolean { return MOCK_MODE; }

  fetchNetflow(chain: Chain, limit = 10) {
    return nansenRun('research smart-money netflow', ['--chain', chain, '--limit', String(limit)]);
  }
  fetchDexTrades(chain: Chain, limit = 10) {
    return nansenRun('research smart-money dex-trades', ['--chain', chain, '--limit', String(limit)]);
  }
  fetchTokenScreener(chain: Chain, timeframe = '24h', limit = 20) {
    return nansenRun('research token screener', ['--chain', chain, '--timeframe', timeframe, '--limit', String(limit)]);
  }
  fetchTokenInfo(chain: Chain, token: string) {
    return nansenRun('research token info', ['--chain', chain, '--token', token]);
  }
  fetchTokenHolders(chain: Chain, token: string, limit = 20) {
    return nansenRun('research token holders', ['--chain', chain, '--token', token, '--limit', String(limit)]);
  }
  fetchWhoBoughtSold(chain: Chain, token: string) {
    return nansenRun('research token who-bought-sold', ['--chain', chain, '--token', token]);
  }
  fetchFlowIntelligence(chain: Chain, token: string) {
    return nansenRun('research token flow-intelligence', ['--chain', chain, '--token', token]);
  }
  fetchTokenIndicators(chain: Chain, token: string) {
    return nansenRun('research token indicators', ['--chain', chain, '--token', token]);
  }
  fetchTokenPnl(chain: Chain, token: string, days = 30) {
    return nansenRun('research token pnl', ['--chain', chain, '--token', token, '--days', String(days)]);
  }
  fetchTokenDexTrades(chain: Chain, token: string, days = 7) {
    return nansenRun('research token dex-trades', ['--chain', chain, '--token', token, '--days', String(days)]);
  }
  fetchTokenJupDca(token: string) {
    return nansenRun('research token jup-dca', ['--token', token]);
  }
  fetchProfilerLabels(address: string, chain: Chain) {
    return nansenRun('research profiler labels', ['--address', address, '--chain', chain]);
  }
  fetchProfilerPnl(address: string, chain: Chain) {
    return nansenRun('research profiler pnl-summary', ['--address', address, '--chain', chain]);
  }
  fetchProfilerCounterparties(address: string, chain: Chain, limit = 10) {
    return nansenRun('research profiler counterparties', ['--address', address, '--chain', chain, '--limit', String(limit)]);
  }
  fetchProfilerRelatedWallets(address: string, chain: Chain) {
    return nansenRun('research profiler related-wallets', ['--address', address, '--chain', chain]);
  }
  fetchPerpScreener(days = 30) {
    return nansenRun('research perp screener', ['--days', String(days)]);
  }
  fetchPerpLeaderboard(days = 30) {
    return nansenRun('research perp leaderboard', ['--days', String(days)]);
  }
  fetchTokenPerpPositions(symbol: string) {
    return nansenRun('research token perp-positions', ['--symbol', symbol]);
  }
  fetchTradeQuote(chain: string, from: string, to: string, amount: string) {
    return nansenRun('trade quote', ['--chain', chain, '--from', from, '--to', to, '--amount', amount]);
  }
  fetchTradeExecute(quoteId: string, wallet?: string) {
    return nansenRun('trade execute', ['--quote', quoteId, ...(wallet ? ['--wallet', wallet] : [])]);
  }
  fetchAccount() {
    return nansenRun('account', []);
  }
  fetchHoldings(chain: Chain, limit = 10) {
    return nansenRun('research smart-money holdings', ['--chain', chain, '--limit', String(limit)]);
  }
  fetchDCAs(chain: Chain, limit = 10) {
    return nansenRun('research smart-money dcas', ['--chain', chain, '--limit', String(limit)]);
  }
  fetchHistoricalHoldings(chain: Chain, limit = 5) {
    return nansenRun('research smart-money historical-holdings', ['--chain', chain, '--limit', String(limit)]);
  }
  fetchSmPerpTrades(chain: Chain, limit = 10) {
    return nansenRun('research smart-money perp-trades', ['--chain', chain, '--limit', String(limit)]);
  }
  fetchNansenAgent(question: string, expert = false) {
    return nansenRun('agent', [question, ...(expert ? ['--expert'] : [])]);
  }
  fetchWalletList() {
    return nansenRun('wallet list', []);
  }
  fetchWalletCreate(name: string) {
    return nansenRun('wallet create', ['--name', name]);
  }
}
