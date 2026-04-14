import OpenAI from 'openai';
import type { ConvergenceSignal } from './convergence.js';
import { formatForAI } from './convergence.js';
import type { ChainScan } from './scanner.js';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export interface AIAnalysis {
  id: string;
  signalId: string;
  thesis: string;
  conviction: number;
  timeHorizon: string;
  risks: string[];
  catalysts: string[];
  historicalPattern: string;
  generatedAt: number;
  model: string;
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set. Get one at https://openrouter.ai/keys');
    client = new OpenAI({
      baseURL: OPENROUTER_BASE,
      apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/dvictor357/hyper-compass',
        'X-Title': 'Hyper Compass',
      },
    });
  }
  return client;
}

const SYSTEM_PROMPT = `You are an elite crypto hedge fund analyst. You analyze smart money on-chain data to generate trade theses.

Your job:
1. Read cross-chain convergence data (which tokens smart money is buying on multiple chains simultaneously)
2. Generate a concise trade thesis explaining WHY smart money is accumulating
3. Rate conviction 0-100 based on signal strength
4. Identify risks and catalysts
5. Compare to historical patterns

Rules:
- Be specific and quantitative. "ETH inflow is $2.4M across 5 chains" not "lots of buying"
- Explain the WHY, not just the WHAT. "Fund accumulation before ETF deadline" not "funds are buying"
- Be honest about uncertainty. If the signal is weak, say so.
- Keep each thesis under 200 words.
- Return ONLY valid JSON, no markdown fences.`;

const ANALYSIS_PROMPT = `Analyze this cross-chain smart money convergence data and generate a trade thesis.

{DATA}

Return a JSON object with these fields:
{
  "thesis": "Your 1-3 sentence trade thesis explaining what smart money is doing and why",
  "conviction": <number 0-100>,
  "timeHorizon": "24h" | "72h" | "1w" | "2w",
  "risks": ["risk1", "risk2"],
  "catalysts": ["catalyst1", "catalyst2"],
  "historicalPattern": "Brief comparison to a historical pattern if applicable"
}`;

export async function analyzeSignal(
  signal: ConvergenceSignal,
  scans: ChainScan[],
): Promise<AIAnalysis> {
  const model = process.env.AI_MODEL || 'anthropic/claude-sonnet-4';
  const relevantScans = scans.filter(s => signal.chains.includes(s.chain));
  const context = [
    formatForAI([signal]),
    '\nRaw scan data for relevant chains:',
    ...relevantScans.map(s => `\n${s.chain}: ${JSON.stringify(s.netflow.slice(0, 5))} DEX: ${JSON.stringify(s.dexTrades.slice(0, 5))}`),
  ].join('\n');

  const prompt = ANALYSIS_PROMPT.replace('{DATA}', context);

  const openai = getClient();
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || '{}';

  let parsed: any;
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      thesis: content.slice(0, 500),
      conviction: 50,
      timeHorizon: '72h',
      risks: ['Failed to parse structured output'],
      catalysts: [],
      historicalPattern: 'N/A',
    };
  }

  return {
    id: `ai-${signal.id}-${Date.now()}`,
    signalId: signal.id,
    thesis: parsed.thesis || 'Analysis unavailable',
    conviction: Math.min(Math.max(Number(parsed.conviction) || 50, 0), 100),
    timeHorizon: parsed.timeHorizon || '72h',
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    catalysts: Array.isArray(parsed.catalysts) ? parsed.catalysts : [],
    historicalPattern: parsed.historicalPattern || 'N/A',
    generatedAt: Date.now(),
    model: response.model || model,
  };
}

export async function analyzeBatch(
  signals: ConvergenceSignal[],
  scans: ChainScan[],
  concurrency = 3,
): Promise<AIAnalysis[]> {
  const results: AIAnalysis[] = [];
  for (let i = 0; i < signals.length; i += concurrency) {
    const batch = signals.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map(s => analyzeSignal(s, scans)));
    for (const r of settled) {
      if (r.status === 'fulfilled') results.push(r.value);
    }
  }
  return results;
}

export function getMockAnalysis(signal: ConvergenceSignal): AIAnalysis {
  const theses: Record<string, string> = {
    ETH: `Smart money is accumulating ETH across ${signal.chains.length} chains with $${(signal.netflowUsd / 1e6).toFixed(1)}M net inflow. This cross-chain convergence pattern resembles the pre-rally accumulation phase seen before the Q3 2025 breakout. ${signal.smartMoneyBuyers} independent fund wallets are building positions simultaneously.`,
    LINK: `Chainlink accumulation detected on ${signal.chains.length} chains. Smart money funds are positioning ahead of expected CCIP v2 announcement.`,
    PEPE: `Meme token accumulation by smart traders on ${signal.chains.length} chains. Unusual convergence suggests coordinated whale activity.`,
  };

  const fallback = `${signal.symbol} showing unusual cross-chain convergence with ${signal.smartMoneyBuyers} smart money wallets across ${signal.chains.join(', ')}. Net inflow of $${(signal.netflowUsd / 1e6).toFixed(1)}M.`;

  return {
    id: `ai-${signal.id}-mock`,
    signalId: signal.id,
    thesis: theses[signal.symbol] || fallback,
    conviction: Math.min(signal.score + 10, 95),
    timeHorizon: signal.score >= 70 ? '72h' : '1w',
    risks: ['Market-wide downturn could override signal', 'Smart money could be hedging, not accumulating'],
    catalysts: ['Upcoming protocol upgrade', 'Institutional fund rebalancing cycle', 'Cross-chain bridge activity increase'],
    historicalPattern: `Similar pattern seen before ${signal.symbol} rallied 18% in Q3 2025`,
    generatedAt: Date.now(),
    model: 'mock',
  };
}
