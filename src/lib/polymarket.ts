const GAMMA_API = 'https://gamma-api.polymarket.com';

const TOKEN_KEYWORDS: Record<string, string[]> = {
  BTC: ['bitcoin', 'btc'],
  ETH: ['ethereum', 'eth', 'ether'],
  SOL: ['solana', 'sol'],
  LINK: ['chainlink', 'link'],
  AVAX: ['avalanche', 'avax'],
  MATIC: ['polygon', 'matic'],
  ARB: ['arbitrum', 'arb'],
  OP: ['optimism'],
  BNB: ['bnb', 'binance coin'],
  UNI: ['uniswap', 'uni'],
  AAVE: ['aave'],
  DOGE: ['dogecoin', 'doge'],
  XRP: ['ripple', 'xrp'],
  ADA: ['cardano', 'ada'],
  DOT: ['polkadot', 'dot'],
  PEPE: ['pepe'],
};

export interface MarketPosition {
  marketId: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  token: string;
}

export interface Divergence {
  token: string;
  smDirection: 'bullish' | 'bearish';
  smConfidence: number;
  crowdSentiment: number;
  score: number;
  question: string;
  explanation: string;
}

export function matchToken(question: string): string | null {
  const lower = question.toLowerCase();
  for (const [symbol, keywords] of Object.entries(TOKEN_KEYWORDS)) {
    for (const kw of keywords) {
      const re = new RegExp(`(?:^|[^a-z])${kw}(?:[^a-z]|$)`, 'i');
      if (re.test(lower)) return symbol;
    }
  }
  return null;
}

export function extractSentiment(market: MarketPosition): number {
  return Math.round(market.yesPrice * 100);
}

export function deriveSmartMoneySignal(data: {
  netflowUsd: number;
  traderCount: number;
}): { direction: 'bullish' | 'bearish'; confidence: number } {
  const direction = data.netflowUsd >= 0 ? 'bullish' : 'bearish';
  const base = Math.min(Math.abs(data.netflowUsd) / 2_000_000, 1.0) * 60;
  const traderBonus = Math.min(data.traderCount / 8, 1.0) * 40;
  return { direction, confidence: Math.round(Math.min(base + traderBonus, 100)) };
}

export async function fetchMarkets(): Promise<MarketPosition[]> {
  if (process.env.NANSEN_MOCK === 'true') return mockMarkets();

  const positions: MarketPosition[] = [];
  const seen = new Set<string>();
  const PAGE_SIZE = 100;
  const MAX_PAGES = 5;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${GAMMA_API}/markets?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}&active=true&closed=false`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      if (page === 0) throw new Error(`Polymarket API error: ${res.status}`);
      break;
    }

    const markets: any[] = await res.json();
    if (markets.length === 0) break;

    for (const m of markets) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);

      const token = matchToken(m.question);
      if (!token) continue;

      const prices = m.outcomePrices || [];
      positions.push({
        marketId: m.id,
        question: m.question,
        yesPrice: parseFloat(prices[0] || '0'),
        noPrice: parseFloat(prices[1] || '0'),
        volume24h: parseFloat(m.volume24hr || '0'),
        token,
      });
    }

    if (markets.length < PAGE_SIZE) break;
  }

  return positions;
}

export function calculateDivergence(
  netflows: Array<{ token: string; netflowUsd: number; traderCount: number }>,
  markets: MarketPosition[],
): Divergence[] {
  const bestMarket = new Map<string, MarketPosition>();
  for (const m of markets) {
    const prev = bestMarket.get(m.token);
    if (!prev || m.volume24h > prev.volume24h) bestMarket.set(m.token, m);
  }

  const results: Divergence[] = [];

  for (const flow of netflows) {
    const market = bestMarket.get(flow.token);
    if (!market) continue;

    const { direction, confidence } = deriveSmartMoneySignal(flow);
    const sentiment = extractSentiment(market);

    const smSentiment = direction === 'bullish' ? 50 + confidence / 2 : 50 - confidence / 2;
    const raw = Math.abs(smSentiment - sentiment);
    const score = Math.round(Math.min(raw * 2, 100));

    results.push({
      token: flow.token,
      smDirection: direction,
      smConfidence: confidence,
      crowdSentiment: sentiment,
      score,
      question: market.question,
      explanation: buildExplanation(flow.token, direction, confidence, sentiment, score, market.question),
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

function buildExplanation(
  token: string, dir: 'bullish' | 'bearish', conf: number,
  sentiment: number, score: number, question: string,
): string {
  const smLabel = dir === 'bullish' ? 'accumulating' : 'distributing';
  const crowdLabel = sentiment >= 60 ? 'optimistic' : sentiment <= 40 ? 'pessimistic' : 'neutral';

  if (score >= 70) {
    return `Strong divergence on ${token}: Smart money is ${smLabel} (${conf}% confidence) while Polymarket crowd is ${crowdLabel} (${sentiment}%) on "${question}". This level of disagreement historically precedes significant price moves.`;
  }
  if (score >= 40) {
    return `Moderate divergence on ${token}: Smart money ${smLabel} at ${conf}% confidence vs crowd sentiment at ${sentiment}% on "${question}".`;
  }
  return `Low divergence on ${token}: Smart money and Polymarket crowd roughly agree. SM ${dir} (${conf}%), crowd at ${sentiment}%.`;
}

function mockMarkets(): MarketPosition[] {
  return [
    { marketId: 'mock-btc', question: 'Will Bitcoin be above $120,000 by July 2026?', yesPrice: 0.42, noPrice: 0.58, volume24h: 2_450_000, token: 'BTC' },
    { marketId: 'mock-eth', question: 'Will Ethereum reach $5,000 before September 2026?', yesPrice: 0.35, noPrice: 0.65, volume24h: 1_890_000, token: 'ETH' },
    { marketId: 'mock-sol', question: 'Will Solana be above $300 by June 2026?', yesPrice: 0.55, noPrice: 0.45, volume24h: 980_000, token: 'SOL' },
    { marketId: 'mock-link', question: 'Will Chainlink reach $50 by end of 2026?', yesPrice: 0.28, noPrice: 0.72, volume24h: 340_000, token: 'LINK' },
    { marketId: 'mock-avax', question: 'Will Avalanche exceed $100 by Q3 2026?', yesPrice: 0.31, noPrice: 0.69, volume24h: 210_000, token: 'AVAX' },
    { marketId: 'mock-arb', question: 'Will Arbitrum token reach $3 by July 2026?', yesPrice: 0.48, noPrice: 0.52, volume24h: 150_000, token: 'ARB' },
  ];
}
