import type { Chain, ProviderResult, DataSourceProvider } from './types.js';
import * as ds from './dexscreener.js';
import * as sm from './smart-money.js';
import * as moralis from './moralis.js';
import * as arkham from './arkham.js';
import * as hl from './hyperliquid.js';
import * as jup from './jupiter.js';
import * as oneinch from './oneinch.js';
import { record, classifyRole } from '../telemetry.js';

const MOCK_MODE = process.env.NANSEN_MOCK === 'true';

function mockResult(data: unknown): ProviderResult {
  return { ok: true, data: { data } };
}

function emptyResult(): ProviderResult {
  return { ok: true, data: { data: [] } };
}

export class FreeProvider implements DataSourceProvider {
  name = 'free';

  isMock(): boolean { return MOCK_MODE; }

  async fetchTokenScreener(chain: Chain, timeframe: string, limit: number): Promise<ProviderResult> {
    if (MOCK_MODE) {
      const { getMockData } = await import('../mock.js');
      return mockResult(getMockData('research token screener', ['--chain', chain]));
    }
    return ds.fetchScreener(chain, timeframe, limit);
  }

  async fetchTokenInfo(chain: Chain, token: string): Promise<ProviderResult> {
    if (MOCK_MODE) {
      const { getMockData } = await import('../mock.js');
      return mockResult(getMockData('research token info', ['--chain', chain, '--token', token]));
    }
    return ds.fetchTokenByAddress(chain, token);
  }

  async fetchNetflow(chain: Chain, limit: number): Promise<ProviderResult> {
    if (MOCK_MODE) {
      const { getMockData } = await import('../mock.js');
      return mockResult(getMockData('research smart-money netflow', ['--chain', chain]));
    }
    return sm.fetchNetflow(chain, limit);
  }

  async fetchDexTrades(chain: Chain, limit: number): Promise<ProviderResult> {
    if (MOCK_MODE) {
      const { getMockData } = await import('../mock.js');
      return mockResult(getMockData('research smart-money dex-trades', ['--chain', chain]));
    }
    return sm.fetchSmDexTrades(chain, limit);
  }

  async fetchTokenHolders(chain: Chain, token: string, limit: number): Promise<ProviderResult> {
    if (MOCK_MODE) {
      return mockResult([
        { owner_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
        { owner_address: '0x28C6c06298d514Db089934071355E5743bf21d60', address: '0x28C6c06298d514Db089934071355E5743bf21d60' },
        { owner_address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B' },
      ]);
    }
    if (chain === 'solana') return emptyResult();
    return moralis.fetchTokenHolders(chain, token, limit);
  }

  async fetchWhoBoughtSold(chain: Chain, token: string): Promise<ProviderResult> {
    if (MOCK_MODE) return mockResult({ smart_money_buyers: 6, smart_money_sellers: 2 });
    return sm.fetchWhoBoughtSold(chain, token);
  }

  async fetchFlowIntelligence(chain: Chain, token: string): Promise<ProviderResult> {
    if (MOCK_MODE) return mockResult({ cex_outflow_usd: 1_200_000, cex_inflow_usd: 400_000 });
    return sm.fetchFlowIntel(chain, token);
  }

  async fetchTokenIndicators(chain: Chain, token: string): Promise<ProviderResult> {
    if (MOCK_MODE) return mockResult({ smart_money_score: 7.5, whale_concentration: 6.2, flow_score: 5.8 });
    return sm.fetchTokenIndicators(chain, token);
  }

  async fetchTokenPnl(chain: Chain, token: string, days: number): Promise<ProviderResult> {
    if (MOCK_MODE) return emptyResult();
    return emptyResult();
  }

  async fetchTokenDexTrades(chain: Chain, token: string, days: number): Promise<ProviderResult> {
    if (MOCK_MODE) return emptyResult();
    return ds.searchPairs(token);
  }

  async fetchTokenJupDca(token: string): Promise<ProviderResult> {
    return emptyResult();
  }

  async fetchProfilerLabels(address: string, chain: Chain): Promise<ProviderResult> {
    if (MOCK_MODE) return mockResult({ labels: ['Smart Trader', 'Fund'], firstSeen: '2023-01-15' });
    return arkham.fetchLabels(address, chain);
  }

  async fetchProfilerPnl(address: string, chain: Chain): Promise<ProviderResult> {
    return mockResult({ pnl: 0 });
  }

  async fetchProfilerCounterparties(address: string, chain: Chain, limit: number): Promise<ProviderResult> {
    if (MOCK_MODE) return mockResult({ counterparties: [] });
    return { ok: true, data: { data: { counterparties: [] } } };
  }

  async fetchProfilerRelatedWallets(address: string, chain: Chain): Promise<ProviderResult> {
    if (MOCK_MODE) return mockResult({ related_wallets: [], wallets: [] });
    return arkham.fetchRelatedWallets(address, chain);
  }

  async fetchPerpScreener(days: number): Promise<ProviderResult> {
    if (MOCK_MODE) return emptyResult();
    return hl.fetchPerpScreener(days);
  }

  async fetchPerpLeaderboard(days: number): Promise<ProviderResult> {
    if (MOCK_MODE) return emptyResult();
    return hl.fetchPerpLeaderboard(days);
  }

  async fetchTokenPerpPositions(symbol: string): Promise<ProviderResult> {
    if (MOCK_MODE) {
      return mockResult({ total_long_usd: 5_000_000, longs: 5_000_000, total_short_usd: 2_000_000, shorts: 2_000_000 });
    }
    return hl.fetchTokenPerpPositions(symbol);
  }

  async fetchTradeQuote(chain: string, from: string, to: string, amount: string): Promise<ProviderResult> {
    if (MOCK_MODE) return mockResult({ price: '3245.50', priceImpact: '0.12%', gasEstimate: '0.003 ETH', route: 'Jupiter', quoteId: 'mock-quote' });
    if (chain === 'solana') {
      return jup.fetchQuote(from, to, amount);
    }
    return oneinch.fetchQuote(chain as Chain, from, to, amount);
  }

  async fetchTradeExecute(quoteId: string, wallet?: string): Promise<ProviderResult> {
    return { ok: false, error: 'Trade execution requires wallet integration', code: 'NOT_IMPLEMENTED' };
  }

  async fetchAccount(): Promise<ProviderResult> {
    return mockResult({ plan: 'free', creditsRemaining: null });
  }

  async fetchHoldings(chain: Chain, limit: number): Promise<ProviderResult> {
    if (MOCK_MODE) {
      const { getMockData } = await import('../mock.js');
      return mockResult((getMockData('research smart-money holdings', ['--chain', chain]) as any[]).slice(0, 3));
    }
    return emptyResult();
  }

  async fetchDCAs(chain: Chain, limit: number): Promise<ProviderResult> {
    return emptyResult();
  }

  async fetchHistoricalHoldings(chain: Chain, limit: number): Promise<ProviderResult> {
    return emptyResult();
  }

  async fetchSmPerpTrades(chain: Chain, limit: number): Promise<ProviderResult> {
    return emptyResult();
  }

  async fetchNansenAgent(question: string, expert: boolean): Promise<ProviderResult> {
    return { ok: false, error: 'Nansen Agent not available in free provider', code: 'NOT_AVAILABLE' };
  }

  async fetchWalletList(): Promise<ProviderResult> {
    return mockResult([]);
  }

  async fetchWalletCreate(name: string): Promise<ProviderResult> {
    return mockResult({ name, created: true });
  }
}
