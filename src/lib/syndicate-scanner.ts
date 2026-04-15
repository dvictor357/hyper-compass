import { CHAINS, type Chain } from './providers/types.js';
import { provider } from './providers/index.js';
import { detectSyndicates, formatReport, type WalletTrade, type SyndicateReport } from './syndicate.js';

const MOCK_TRADES: WalletTrade[] = [
  { wallet: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', token: 'PEPE', chain: 'ethereum', timestamp: Date.now() - 480_000, valueUsd: 450_000, side: 'buy', label: 'Smart Trader' },
  { wallet: '0x28C6c06298d514Db089934071355E5743bf21d60', token: 'PEPE', chain: 'ethereum', timestamp: Date.now() - 360_000, valueUsd: 380_000, side: 'buy', label: 'Fund' },
  { wallet: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', token: 'PEPE', chain: 'base', timestamp: Date.now() - 240_000, valueUsd: 290_000, side: 'buy', label: 'Fund' },
  { wallet: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', token: 'PEPE', chain: 'ethereum', timestamp: Date.now() - 120_000, valueUsd: 210_000, side: 'buy', label: '90D Trader' },

  { wallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', token: 'JUP', chain: 'solana', timestamp: Date.now() - 900_000, valueUsd: 380_000, side: 'buy', label: 'Smart Trader' },
  { wallet: 'DYw5HsfYFmNmCPWMqkqPATCB5C9P4q6WaLcmE7bxCJrS', token: 'JUP', chain: 'solana', timestamp: Date.now() - 600_000, valueUsd: 520_000, side: 'buy', label: 'Fund' },
  { wallet: '3KzvtnCq1uhqBWLqZ9LY4bR8EB1K8YcKR2q4j6H9Vcbk', token: 'JUP', chain: 'solana', timestamp: Date.now() - 300_000, valueUsd: 170_000, side: 'buy', label: '30D Trader' },

  { wallet: '0x4A8e60D8CB3C782D0D3c4C04be0C0C8D04f1D1f5', token: 'ETH', chain: 'arbitrum', timestamp: Date.now() - 1_200_000, valueUsd: 890_000, side: 'buy', label: 'Fund' },
  { wallet: '0x2Ce21976443622ab8F0B7F6fa3aF953ff9BCd5A7', token: 'ETH', chain: 'optimism', timestamp: Date.now() - 720_000, valueUsd: 560_000, side: 'buy', label: 'Smart Trader' },
  { wallet: '0xDe9018BfF1bCc43e3BD09e3db0FAb367E32CfB47', token: 'ETH', chain: 'base', timestamp: Date.now() - 360_000, valueUsd: 720_000, side: 'buy', label: 'Fund' },

  { wallet: '0x9F3BfC5D88afC0E4C0E3Ac7e93aDe842E5d4F3b2', token: 'LINK', chain: 'polygon', timestamp: Date.now() - 7_200_000, valueUsd: 120_000, side: 'buy', label: 'Whale' },
  { wallet: '0xFe2e15D4A5B9BbC7A63B7A4e3E17b42B24a75cf4', token: 'UNI', chain: 'ethereum', timestamp: Date.now() - 3_600_000, valueUsd: 95_000, side: 'sell', label: 'Whale' },
];

export async function scanForSyndicates(chains?: Chain[]): Promise<SyndicateReport> {
  const p = provider();
  if (p.isMock()) {
    return detectSyndicates(MOCK_TRADES);
  }

  const targets = chains ?? [...CHAINS];
  const allTrades: WalletTrade[] = [];
  const BATCH = 4;

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(c => p.fetchDexTrades(c, 50)));

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const chain = batch[j];
      if (r.status !== 'fulfilled' || !r.value?.ok) continue;

      const raw = (r.value.data?.data as any[]) ?? [];
      for (const item of raw) {
        const trade = mapToWalletTrade(item, chain);
        if (trade) allTrades.push(trade);
      }
    }
  }

  return detectSyndicates(allTrades);
}

function mapToWalletTrade(raw: any, chain: Chain): WalletTrade | null {
  const wallet = raw.trader_address || raw.wallet || raw.trader;
  const token = raw.token_bought_symbol || raw.boughtSymbol || raw.symbol;
  const value = parseFloat(raw.trade_value_usd ?? raw.value_usd ?? raw.valueUsd ?? 0);
  const tsRaw = raw.block_timestamp || raw.timestamp;

  if (!wallet || !token || value <= 0) return null;

  let timestamp: number;
  if (typeof tsRaw === 'number') {
    timestamp = tsRaw;
  } else if (typeof tsRaw === 'string') {
    timestamp = new Date(tsRaw).getTime();
  } else {
    timestamp = Date.now();
  }

  return {
    wallet,
    token: token.toUpperCase(),
    chain,
    timestamp,
    valueUsd: value,
    side: 'buy',
    label: raw.trader_address_label || raw.label || raw.traderLabel || undefined,
  };
}

export { formatReport };
