import type { Chain } from './providers/types.ts';

type TokenEntry = {
  symbol: string;
  address: string;
  netFlow1h: number;
  netFlow24h: number;
  netFlow7d: number;
  netFlow30d: number;
  chain: string;
  traderCount: number;
  marketCap: number;
};

type DexTrade = {
  boughtSymbol: string;
  boughtAddress: string;
  soldSymbol: string;
  soldAddress: string;
  valueUsd: number;
  trader: string;
  traderLabel: string;
  chain: string;
  timestamp: string;
};

type ScreenerRow = {
  symbol: string;
  priceUsd: string;
  change24h: string;
  volume24h: string;
  marketCap: string;
};

const NETFLOW: Record<string, TokenEntry[]> = {
  ethereum: [
    { symbol: 'ETH', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', netFlow1h: 120000, netFlow24h: 2450000, netFlow7d: 5200000, netFlow30d: 12400000, chain: 'ethereum', traderCount: 12, marketCap: 244000000000 },
    { symbol: 'PEPE', address: '0x6982508145454ce325ddbe47a25d4ec3d2311933', netFlow1h: 45000, netFlow24h: 890000, netFlow7d: 1500000, netFlow30d: 3200000, chain: 'ethereum', traderCount: 7, marketCap: 3700000000 },
    { symbol: 'LINK', address: '0x514910771af9ca656af840dff83e8264ecf986ca', netFlow1h: 0, netFlow24h: 560000, netFlow7d: 1200000, netFlow30d: 2800000, chain: 'ethereum', traderCount: 5, marketCap: 11200000000 },
    { symbol: 'UNI', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', netFlow1h: 0, netFlow24h: 340000, netFlow7d: 780000, netFlow30d: 1900000, chain: 'ethereum', traderCount: 4, marketCap: 7400000000 },
    { symbol: 'AAVE', address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', netFlow1h: 0, netFlow24h: 210000, netFlow7d: 450000, netFlow30d: 980000, chain: 'ethereum', traderCount: 3, marketCap: 1385000000 },
  ],
  solana: [
    { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112', netFlow1h: 89000, netFlow24h: 1870000, netFlow7d: 4100000, netFlow30d: 9800000, chain: 'solana', traderCount: 9, marketCap: 78000000000 },
    { symbol: 'JUP', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', netFlow1h: 12000, netFlow24h: 720000, netFlow7d: 1800000, netFlow30d: 4200000, chain: 'solana', traderCount: 6, marketCap: 1700000000 },
    { symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', netFlow1h: 34000, netFlow24h: 430000, netFlow7d: 920000, netFlow30d: 2100000, chain: 'solana', traderCount: 8, marketCap: 1500000000 },
  ],
  base: [
    { symbol: 'ETH', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', netFlow1h: 56000, netFlow24h: 1120000, netFlow7d: 2800000, netFlow30d: 6700000, chain: 'base', traderCount: 8, marketCap: 244000000000 },
    { symbol: 'AERO', address: '0x940181a94a35a4569e4529a3cdfb74e38fd98631', netFlow1h: 0, netFlow24h: 560000, netFlow7d: 1200000, netFlow30d: 2900000, chain: 'base', traderCount: 5, marketCap: 780000000 },
  ],
  bnb: [
    { symbol: 'BNB', address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', netFlow1h: 0, netFlow24h: 520000, netFlow7d: 1100000, netFlow30d: 2600000, chain: 'bnb', traderCount: 4, marketCap: 89000000000 },
    { symbol: 'CAKE', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', netFlow1h: 0, netFlow24h: 180000, netFlow7d: 450000, netFlow30d: 1100000, chain: 'bnb', traderCount: 3, marketCap: 980000000 },
  ],
  hyperliquid: [
    { symbol: 'HYPE', address: '0x0000000000000000000000000000000000000000', netFlow1h: 0, netFlow24h: 380000, netFlow7d: 890000, netFlow30d: 2100000, chain: 'hyperliquid', traderCount: 6, marketCap: 2400000000 },
  ],
};

const now = () => new Date().toISOString();

const DEX_TRADES: Record<string, DexTrade[]> = {
  ethereum: [
    { boughtSymbol: 'PEPE', boughtAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933', soldSymbol: 'USDC', soldAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', valueUsd: 450000, trader: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', traderLabel: 'Smart Trader', chain: 'ethereum', timestamp: now() },
    { boughtSymbol: 'ETH', boughtAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', soldSymbol: 'USDC', soldAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', valueUsd: 1200000, trader: '0x28C6c06298d514Db089934071355E5743bf21d60', traderLabel: 'Fund', chain: 'ethereum', timestamp: now() },
    { boughtSymbol: 'LINK', boughtAddress: '0x514910771af9ca656af840dff83e8264ecf986ca', soldSymbol: 'ETH', soldAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', valueUsd: 280000, trader: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', traderLabel: '90D Trader', chain: 'ethereum', timestamp: now() },
  ],
  solana: [
    { boughtSymbol: 'JUP', boughtAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', soldSymbol: 'USDC', soldAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', valueUsd: 380000, trader: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', traderLabel: 'Smart Trader', chain: 'solana', timestamp: now() },
    { boughtSymbol: 'SOL', boughtAddress: 'So11111111111111111111111111111111111111112', soldSymbol: 'USDC', soldAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', valueUsd: 890000, trader: 'DYw5HsfYFmNmCPWMqkqPATCB5C9P4q6WaLcmE7bxCJrS', traderLabel: 'Fund', chain: 'solana', timestamp: now() },
  ],
  base: [
    { boughtSymbol: 'ETH', boughtAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', soldSymbol: 'USDC', soldAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', valueUsd: 560000, trader: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', traderLabel: 'Fund', chain: 'base', timestamp: now() },
    { boughtSymbol: 'AERO', boughtAddress: '0x940181a94a35a4569e4529a3cdfb74e38fd98631', soldSymbol: 'ETH', soldAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', valueUsd: 230000, trader: '0xDe9018BfF1bCc43e3BD09e3db0FAb367E32CfB47', traderLabel: 'Smart Trader', chain: 'base', timestamp: now() },
  ],
  bnb: [
    { boughtSymbol: 'BNB', boughtAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', soldSymbol: 'USDT', soldAddress: '0x55d398326f99059ff775485246999027b3197955', valueUsd: 290000, trader: '0x8C2D48ea5DcD3c5e2f3c6FC02CA4D16e3B0e22F1', traderLabel: 'Whale', chain: 'bnb', timestamp: now() },
  ],
  hyperliquid: [],
};

const SCREENER: Record<string, ScreenerRow[]> = {
  ethereum: [
    { symbol: 'PEPE', priceUsd: '0.0000089', change24h: '+12.4%', volume24h: '890000000', marketCap: '3700000000' },
    { symbol: 'LINK', priceUsd: '18.45', change24h: '+5.2%', volume24h: '450000000', marketCap: '11200000000' },
  ],
  solana: [
    { symbol: 'JUP', priceUsd: '1.23', change24h: '+8.7%', volume24h: '340000000', marketCap: '1700000000' },
    { symbol: 'BONK', priceUsd: '0.0000234', change24h: '+15.3%', volume24h: '560000000', marketCap: '1500000000' },
  ],
  base: [
    { symbol: 'AERO', priceUsd: '1.87', change24h: '+6.2%', volume24h: '120000000', marketCap: '780000000' },
  ],
  bnb: [
    { symbol: 'CAKE', priceUsd: '3.40', change24h: '+1.2%', volume24h: '95000000', marketCap: '980000000' },
  ],
  hyperliquid: [],
};

const ACCOUNT_MOCK = { plan: 'pro', creditsRemaining: 470 };

function extractChain(args: string[]): string {
  return args.find((_, i) => args[i - 1] === '--chain') || 'ethereum';
}

function extractToken(args: string[]): string {
  return args.find((_, i) => args[i - 1] === '--token') || 'UNKNOWN';
}

export function getMockData(command: string, args: string[]): unknown {
  const chain = extractChain(args);

  if (command.includes('netflow')) return NETFLOW[chain] || [];
  if (command.includes('dex-trades')) return DEX_TRADES[chain] || [];
  if (command.includes('screener')) return SCREENER[chain] || [];
  if (command.includes('holdings')) return (NETFLOW[chain] || []).slice(0, 3);
  if (command === 'account') return ACCOUNT_MOCK;
  if (command.includes('token info')) return { symbol: extractToken(args), priceUsd: '3245.50', marketCap: '390000000000', volume24h: '12000000000' };
  if (command.includes('profiler labels')) return { labels: ['Smart Trader', 'Fund'], firstSeen: '2023-01-15' };
  if (command.includes('trade quote')) return { price: '3245.50', priceImpact: '0.12%', gasEstimate: '0.003 ETH', route: 'Uniswap V3' };

  return [];
}
