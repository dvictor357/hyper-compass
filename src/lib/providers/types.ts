export const CHAINS = [
  'ethereum', 'solana', 'base', 'bnb', 'hyperliquid',
] as const;

export type Chain = typeof CHAINS[number];

export interface ProviderResult<T = unknown> {
  ok: boolean;
  data?: { data: T; pagination?: { total: number; page: number; limit: number } };
  error?: string;
  code?: string;
}

export interface DataSourceProvider {
  name: string;

  isMock(): boolean;

  fetchTokenScreener(chain: Chain, timeframe: string, limit: number): Promise<ProviderResult>;
  fetchTokenInfo(chain: Chain, token: string): Promise<ProviderResult>;

  fetchNetflow(chain: Chain, limit: number): Promise<ProviderResult>;
  fetchDexTrades(chain: Chain, limit: number): Promise<ProviderResult>;

  fetchTokenHolders(chain: Chain, token: string, limit: number): Promise<ProviderResult>;
  fetchWhoBoughtSold(chain: Chain, token: string): Promise<ProviderResult>;
  fetchFlowIntelligence(chain: Chain, token: string): Promise<ProviderResult>;
  fetchTokenIndicators(chain: Chain, token: string): Promise<ProviderResult>;
  fetchTokenPnl(chain: Chain, token: string, days: number): Promise<ProviderResult>;
  fetchTokenDexTrades(chain: Chain, token: string, days: number): Promise<ProviderResult>;

  fetchProfilerLabels(address: string, chain: Chain): Promise<ProviderResult>;
  fetchProfilerPnl(address: string, chain: Chain): Promise<ProviderResult>;
  fetchProfilerCounterparties(address: string, chain: Chain, limit: number): Promise<ProviderResult>;
  fetchProfilerRelatedWallets(address: string, chain: Chain): Promise<ProviderResult>;

  fetchPerpScreener(days: number): Promise<ProviderResult>;
  fetchPerpLeaderboard(days: number): Promise<ProviderResult>;
  fetchTokenPerpPositions(symbol: string): Promise<ProviderResult>;

  fetchTradeQuote(chain: string, from: string, to: string, amount: string): Promise<ProviderResult>;
  fetchTradeExecute(quoteId: string, wallet?: string): Promise<ProviderResult>;

  fetchAccount(): Promise<ProviderResult>;

  fetchHoldings(chain: Chain, limit: number): Promise<ProviderResult>;
  fetchDCAs(chain: Chain, limit: number): Promise<ProviderResult>;
  fetchHistoricalHoldings(chain: Chain, limit: number): Promise<ProviderResult>;
  fetchSmPerpTrades(chain: Chain, limit: number): Promise<ProviderResult>;
  fetchTokenJupDca(token: string): Promise<ProviderResult>;
  fetchNansenAgent(question: string, expert: boolean): Promise<ProviderResult>;
  fetchWalletList(): Promise<ProviderResult>;
  fetchWalletCreate(name: string): Promise<ProviderResult>;
}
