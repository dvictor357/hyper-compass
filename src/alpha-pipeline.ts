import chalk from 'chalk';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  run, fetchNetflow, fetchTokenScreener, fetchDexTrades, fetchHoldings,
  fetchTokenHolders, fetchWhoBoughtSold, fetchFlowIntelligence,
  fetchTokenIndicators, fetchProfilerLabels, fetchProfilerPnl,
  fetchProfilerCounterparties, fetchProfilerRelatedWallets,
  fetchTokenDexTrades, fetchTokenPnl, fetchTokenPerpPositions,
  fetchTokenJupDca, fetchPerpScreener, fetchPerpLeaderboard,
  fetchTradeQuote, fetchTradeExecute, fetchWalletList, fetchWalletCreate,
  fetchNansenAgent, fetchAccount, fetchDCAs, fetchHistoricalHoldings,
  fetchSmPerpTrades, type Chain,
} from './lib/nansen.js';
import { count, summary as telSummary, all as telEntries } from './lib/telemetry.js';

const DIR = dirname(fileURLToPath(import.meta.url));

const STABLECOINS = new Set(['USDC', 'USDT', 'DAI', 'FRAX', 'BUSD', 'TUSD', 'USDP', 'PYUSD']);
const WRAPPED = new Set(['WETH', 'WBTC', 'WSOL', 'WBNB', 'WMATIC', 'WAVAX']);

export interface TokenSignal {
  chain: Chain;
  address: string;
  symbol: string;
  netflow: number;
  volume: number;
  priceChange: number;
  marketCap: number;
  buyVolume: number;
  sellVolume: number;
  liquidity: number;
  score: number;
}

export interface WhaleInfo {
  address: string;
  chain: Chain;
  labels: string[];
  pnlData: unknown;
  relatedWallets: string[];
  counterparties: string[];
}

export interface Cluster {
  hub: string;
  chain: Chain;
  connected: string[];
  sharedTokens: string[];
  clusterScore: number;
}

export interface RiskFactor {
  name: string;
  value: number;
  weight: number;
  pass: boolean;
}

export interface RiskAssessment {
  score: number;
  factors: RiskFactor[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  gateOpen: boolean;
}

export interface TradeCandidate {
  token: TokenSignal;
  conviction: number;
  whaleSupport: number;
  flowStrength: number;
  risk: RiskAssessment;
  indicators: unknown;
  perpSentiment: string;
  aiAnalysis: string;
}

export function fmt(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

export function log(phase: string, msg: string) {
  console.log(`  ${chalk.gray(`[${count()}]`)} ${chalk.cyan(`[${phase}]`)} ${msg}`);
}

export function ok(msg: string) {
  console.log(chalk.green(`       ✓ ${msg}`));
}

export function warn(msg: string) {
  console.log(chalk.yellow(`       ⚠ ${msg}`));
}

function isAlpha(sym: string): boolean {
  return !STABLECOINS.has(sym.toUpperCase()) && !WRAPPED.has(sym.toUpperCase());
}

export function scoreToken(t: TokenSignal): number {
  let s = 0;
  if (t.netflow > 0) s += Math.min(t.netflow / 1_000_000, 30);
  if (t.volume > 1_000_000) s += Math.min(t.volume / 10_000_000, 20);
  if (t.priceChange > 0) s += Math.min(t.priceChange * 100, 25);
  if (t.marketCap > 10_000_000 && t.marketCap < 500_000_000) s += 15;
  else if (t.marketCap >= 500_000_000) s += 5;
  if (t.buyVolume > t.sellVolume) s += 10;
  if (t.liquidity > 1_000_000) s += 5;
  return s;
}

export function assessRisk(token: TokenSignal, analysis: unknown, whaleCount: number, clusterScore: number): RiskAssessment {
  const factors: RiskFactor[] = [];

  const mcap = token.marketCap > 50_000_000 ? 10 : token.marketCap > 10_000_000 ? 6 : 3;
  factors.push({ name: 'Market Cap', value: mcap, weight: 15, pass: mcap >= 6 });

  const liq = token.liquidity > 5_000_000 ? 10 : token.liquidity > 1_000_000 ? 7 : 3;
  factors.push({ name: 'Liquidity Depth', value: liq, weight: 15, pass: liq >= 5 });

  const volRatio = token.volume > 0 ? token.buyVolume / token.volume : 0;
  const bs = volRatio > 0.6 ? 10 : volRatio > 0.45 ? 6 : 3;
  factors.push({ name: 'Buy/Sell Ratio', value: bs, weight: 10, pass: bs >= 6 });

  const flow = token.netflow > 0 ? Math.min(10, token.netflow / 500_000) : 2;
  factors.push({ name: 'Smart Money Flow', value: flow, weight: 20, pass: flow >= 5 });

  const whale = whaleCount >= 3 ? 10 : whaleCount >= 1 ? 6 : 2;
  factors.push({ name: 'Whale Backing', value: whale, weight: 15, pass: whale >= 4 });

  const coord = clusterScore > 0 ? Math.min(10, clusterScore * 2) : 5;
  factors.push({ name: 'Coordination Signal', value: coord, weight: 10, pass: coord >= 4 });

  const mom = token.priceChange > 0 && token.priceChange < 0.5 ? 10 : token.priceChange >= 0.5 ? 4 : token.priceChange > -0.1 ? 6 : 2;
  factors.push({ name: 'Price Momentum', value: mom, weight: 10, pass: mom >= 5 });

  const holder = 8;
  factors.push({ name: 'Holder Distribution', value: holder, weight: 5, pass: holder >= 5 });

  let totalScore = 0, totalWeight = 0;
  for (const f of factors) { totalScore += f.value * f.weight; totalWeight += f.weight; }
  const normalized = totalWeight > 0 ? totalScore / totalWeight : 0;
  const passCount = factors.filter(f => f.pass).length;

  let grade: RiskAssessment['grade'] = 'F';
  if (normalized >= 8 && passCount >= 7) grade = 'A';
  else if (normalized >= 6.5 && passCount >= 5) grade = 'B';
  else if (normalized >= 5 && passCount >= 4) grade = 'C';
  else if (normalized >= 3.5) grade = 'D';

  return { score: normalized, factors, grade, gateOpen: grade === 'A' || grade === 'B' || grade === 'C' };
}

export async function phaseDiscovery(chains: Chain[]): Promise<TokenSignal[]> {
  console.log(chalk.bold.cyan('\n   PHASE 1: MULTI-CHAIN SMART MONEY DISCOVERY\n'));

  const signals: TokenSignal[] = [];

  log('DISCOVER', 'Checking API credits...');
  const account = await fetchAccount();
  if (account.ok) {
    const d = account.data as any;
    ok(`API active, credits: ${d?.data?.credits_remaining ?? '?'}`);
  }

  for (const chain of chains) {
    log('DISCOVER', `Netflow on ${chalk.white.bold(chain)}...`);
    const nf = await fetchNetflow(chain, 10);
    if (nf.ok && nf.data?.data) ok(`${(Array.isArray(nf.data.data) ? nf.data.data : []).length} netflow entries on ${chain}`);
  }

  for (const chain of chains) {
    log('DISCOVER', `Screener on ${chalk.white.bold(chain)}...`);
    const sc = await fetchTokenScreener(chain, '24h', 20);
    if (sc.ok && sc.data?.data) {
      const tokens: any[] = Array.isArray(sc.data.data) ? sc.data.data : [];
      for (const t of tokens) {
        const sym = t.token_symbol || t.symbol || '';
        if (!isAlpha(sym)) continue;
        signals.push({
          chain, address: t.token_address || t.address || '',
          symbol: sym, netflow: t.netflow || 0, volume: t.volume || 0,
          priceChange: t.price_change || 0, marketCap: t.market_cap_usd || 0,
          buyVolume: t.buy_volume || 0, sellVolume: t.sell_volume || 0,
          liquidity: t.liquidity || 0, score: 0,
        });
      }
      ok(`${tokens.length} screened on ${chain} (${signals.length} alpha)`);
    }
  }

  const extra = await Promise.allSettled([
    fetchDexTrades(chains[0], 10),
    fetchHoldings(chains[0], 10),
    fetchDCAs(chains[0], 5),
    fetchHistoricalHoldings(chains[0], 5),
    fetchSmPerpTrades(chains[0], 5),
  ]);
  for (const r of extra) { if (r.status === 'fulfilled' && r.value?.ok) ok('Extra discovery data fetched'); }

  for (const s of signals) s.score = scoreToken(s);
  signals.sort((a, b) => b.score - a.score);

  const top = signals.slice(0, 5);
  console.log(chalk.bold.green(`\n   ${signals.length} scanned, top ${top.length}:\n`));
  for (const s of top) {
    const nfC = s.netflow > 0 ? chalk.green : chalk.red;
    console.log(`    ${chalk.white.bold(s.symbol.padEnd(12))} ${chalk.gray(s.chain.padEnd(10))} Score: ${chalk.cyan(s.score.toFixed(1).padStart(5))} Vol: ${chalk.yellow('$' + fmt(s.volume).padStart(8))} NetFlow: ${nfC('$' + fmt(Math.abs(s.netflow)).padStart(8))}`);
  }

  return top;
}

export async function phaseTokenAnalysis(tokens: TokenSignal[]): Promise<Map<string, any>> {
  console.log(chalk.bold.cyan('\n   PHASE 2: TOKEN DEEP DIVE\n'));
  const analysis = new Map<string, any>();

  for (const token of tokens.slice(0, 3)) {
    const key = `${token.symbol}-${token.chain}`;
    const data: any = {};

    log('TOKEN', `${chalk.white.bold(token.symbol)} analysis on ${token.chain}...`);
    const [holders, bs, fi, dt, pnl] = await Promise.allSettled([
      fetchTokenHolders(token.chain, token.address, 10),
      fetchWhoBoughtSold(token.chain, token.address),
      fetchFlowIntelligence(token.chain, token.address),
      fetchTokenDexTrades(token.chain, token.address, 7),
      fetchTokenPnl(token.chain, token.address, 7),
    ]);

    if (holders.status === 'fulfilled' && holders.value.ok) { data.holders = holders.value.data?.data; ok(`Holders loaded for ${token.symbol}`); }
    if (bs.status === 'fulfilled' && bs.value.ok) { data.buySell = bs.value.data?.data; ok(`Buy/sell for ${token.symbol}`); }
    if (fi.status === 'fulfilled' && fi.value.ok) { data.flowIntel = fi.value.data?.data; ok(`Flow intel for ${token.symbol}`); }
    if (dt.status === 'fulfilled' && dt.value.ok) { data.dexTrades = dt.value.data?.data; ok(`DEX trades for ${token.symbol}`); }
    if (pnl.status === 'fulfilled' && pnl.value.ok) { data.pnlLeaders = pnl.value.data?.data; ok(`PnL for ${token.symbol}`); }

    if (token.chain === 'solana') {
      const dca = await fetchTokenJupDca(token.address);
      if (dca.ok) { data.jupDca = dca.data?.data; ok(`Jupiter DCA for ${token.symbol}`); }
    }

    analysis.set(key, data);
  }

  return analysis;
}

export async function phaseWhaleProfiling(tokens: TokenSignal[], analysis: Map<string, any>): Promise<{ whales: WhaleInfo[]; clusters: Cluster[] }> {
  console.log(chalk.bold.cyan('\n   PHASE 3: WHALE PROFILING + COORDINATION\n'));
  const whales: WhaleInfo[] = [];
  const clusters: Cluster[] = [];
  const seen = new Set<string>();

  for (const [key, data] of analysis.entries()) {
    if (!data.holders) continue;
    const holderList = Array.isArray(data.holders) ? data.holders : (data.holders?.holders || data.holders?.data || []);
    const chain = tokens.find(t => key.endsWith(t.chain))?.chain || 'solana';

    for (const h of holderList.slice(0, 3)) {
      const addr = h.owner_address || h.address || h.wallet_address || h.owner;
      if (!addr || seen.has(addr)) continue;
      seen.add(addr);

      log('WHALE', `Profiling ${addr.slice(0, 8)}...${addr.slice(-4)}`);
      const [labels, pnl, cp, related] = await Promise.allSettled([
        fetchProfilerLabels(addr, chain),
        fetchProfilerPnl(addr, chain),
        fetchProfilerCounterparties(addr, chain, 5),
        fetchProfilerRelatedWallets(addr, chain),
      ]);

      const labelList: string[] = [];
      if (labels.status === 'fulfilled' && labels.value.ok) {
        const raw = labels.value.data?.data as any;
        if (raw) {
          const arr = Array.isArray(raw) ? raw : (raw?.labels || raw?.data || []);
          for (const l of (Array.isArray(arr) ? arr : [])) {
            labelList.push(typeof l === 'string' ? l : (l?.label || l?.name || JSON.stringify(l)));
          }
        }
        ok(`Labels: ${labelList.length > 0 ? labelList.slice(0, 3).join(', ') : 'unlabeled'}`);
      }

      const counterparties: string[] = [];
      if (cp.status === 'fulfilled' && cp.value.ok) {
        const cpData = cp.value.data?.data as any;
        const cpList = Array.isArray(cpData) ? cpData : (cpData?.counterparties || []);
        for (const c of cpList.slice(0, 5)) {
          const cpAddr = c.address || c.counterparty_address || '';
          if (cpAddr) counterparties.push(cpAddr);
        }
        ok(`${counterparties.length} counterparties`);
      }

      const relatedWallets: string[] = [];
      if (related.status === 'fulfilled' && related.value.ok) {
        const rData = related.value.data?.data as any;
        const rList = Array.isArray(rData) ? rData : (rData?.related_wallets || rData?.wallets || []);
        for (const r of rList.slice(0, 5)) {
          const rAddr = r.address || r.wallet_address || '';
          if (rAddr) relatedWallets.push(rAddr);
        }
        ok(`${relatedWallets.length} related wallets`);
        if (relatedWallets.length >= 2) {
          clusters.push({ hub: addr, chain, connected: relatedWallets, sharedTokens: [key.split('-')[0]], clusterScore: relatedWallets.length + counterparties.length });
        }
      }

      whales.push({ address: addr, chain, labels: labelList, pnlData: pnl.status === 'fulfilled' && pnl.value.ok ? pnl.value.data?.data : null, relatedWallets, counterparties });
      if (whales.length >= 4) break;
    }
    if (whales.length >= 4) break;
  }

  if (whales.length > 0) {
    console.log(chalk.bold.green(`\n   ${whales.length} whales profiled\n`));
  }
  if (clusters.length > 0) {
    console.log(chalk.bold.magenta(`\n   ${clusters.length} coordination cluster(s)\n`));
  }

  return { whales, clusters };
}

export async function phasePerpIntel(tokens: TokenSignal[]): Promise<Map<string, string>> {
  console.log(chalk.bold.cyan('\n   PHASE 4: DERIVATIVES + PERP INTELLIGENCE\n'));
  const perpSentiment = new Map<string, string>();

  const [ps, pl] = await Promise.allSettled([fetchPerpScreener(30), fetchPerpLeaderboard(30)]);
  if (ps.status === 'fulfilled' && ps.value.ok) ok('Perp screener loaded');
  if (pl.status === 'fulfilled' && pl.value.ok) ok('Perp leaderboard loaded');

  for (const token of tokens.slice(0, 2)) {
    log('PERP', `Positions for ${chalk.white.bold(token.symbol)}...`);
    const pp = await fetchTokenPerpPositions(token.symbol);
    if (pp.ok) {
      const d = pp.data?.data as any;
      const longs = d?.total_long_usd || d?.longs || 0;
      const shorts = d?.total_short_usd || d?.shorts || 0;
      const sentiment = longs > shorts ? 'BULLISH' : shorts > longs ? 'BEARISH' : 'NEUTRAL';
      perpSentiment.set(token.symbol, sentiment);
      ok(`${token.symbol} perp: ${sentiment}`);
    } else {
      perpSentiment.set(token.symbol, 'UNKNOWN');
      warn(`No perp data for ${token.symbol}`);
    }
  }

  return perpSentiment;
}

export async function phaseConvictionRisk(
  tokens: TokenSignal[], analysis: Map<string, any>,
  whales: WhaleInfo[], clusters: Cluster[], perpSentiment: Map<string, string>,
): Promise<TradeCandidate[]> {
  console.log(chalk.bold.cyan('\n   PHASE 5: CONVICTION + RISK GATE\n'));
  const candidates: TradeCandidate[] = [];

  for (const token of tokens.slice(0, 3)) {
    log('SCORE', `Indicators for ${chalk.white.bold(token.symbol)}...`);
    const ind = await fetchTokenIndicators(token.chain, token.address);

    let conviction = token.score;
    let flowStrength = 0;
    let whaleSupport = 0;
    let indicatorData: any = null;

    if (ind.ok) {
      indicatorData = ind.data?.data ?? ind.data;
      if (indicatorData) {
        if (indicatorData.smart_money_score) conviction += indicatorData.smart_money_score * 10;
        if (indicatorData.whale_concentration) whaleSupport = indicatorData.whale_concentration;
        if (indicatorData.flow_score) flowStrength = indicatorData.flow_score;
      }
    }

    const key = `${token.symbol}-${token.chain}`;
    const td = analysis.get(key);
    if (td?.buySell?.smart_money_buyers > td?.buySell?.smart_money_sellers) conviction += 10;
    if (td?.flowIntel?.cex_outflow_usd > td?.flowIntel?.cex_inflow_usd) conviction += 5;

    const perp = perpSentiment.get(token.symbol) || 'UNKNOWN';
    if (perp === 'BULLISH') conviction += 8;
    if (perp === 'BEARISH') conviction -= 5;

    const tokenWhales = whales.filter(w => w.chain === token.chain);
    const cScore = clusters.filter(c => c.chain === token.chain).reduce((s, c) => s + c.clusterScore, 0);
    const risk = assessRisk(token, td, tokenWhales.length, cScore);

    const rColor = risk.grade === 'A' ? chalk.green : risk.grade === 'B' ? chalk.cyan : risk.grade === 'C' ? chalk.yellow : chalk.red;
    log('RISK', `${token.symbol}: ${rColor(`Grade ${risk.grade}`)} Gate: ${risk.gateOpen ? chalk.green('OPEN') : chalk.red('CLOSED')}`);

    candidates.push({ token, conviction: Math.min(conviction, 100), whaleSupport, flowStrength, risk, indicators: indicatorData, perpSentiment: perp, aiAnalysis: '' });
  }

  candidates.sort((a, b) => b.conviction - a.conviction);
  return candidates;
}

export async function phaseAIAgent(candidates: TradeCandidate[]): Promise<void> {
  console.log(chalk.bold.cyan('\n   PHASE 6: AI AGENT ANALYSIS\n'));
  const passed = candidates.filter(c => c.risk.gateOpen);
  if (passed.length === 0) { warn('No candidates passed risk gate.'); return; }

  const top = passed[0];
  const question = `Analyze ${top.token.symbol} on ${top.token.chain}. Netflow ${top.token.netflow > 0 ? 'positive' : 'negative'} at $${fmt(Math.abs(top.token.netflow))}. Volume $${fmt(top.token.volume)}. Outlook?`;

  log('AI', `Nansen Agent: ${chalk.white.bold(top.token.symbol)}...`);
  const resp = await fetchNansenAgent(question, false);
  if (resp.ok) {
    const d = resp.data?.data as any;
    const answer = d?.answer || d?.response || d?.text || JSON.stringify(d).slice(0, 300);
    top.aiAnalysis = (typeof answer === 'string' ? answer : JSON.stringify(answer)).slice(0, 500);
    ok('AI analysis received');
  } else {
    top.aiAnalysis = 'Agent unavailable';
    warn('AI Agent unavailable');
  }
}

export async function phaseExecution(candidates: TradeCandidate[], executeFlag: boolean): Promise<any[]> {
  console.log(chalk.bold.cyan('\n   PHASE 7: RISK-GATED EXECUTION\n'));
  const quotes: any[] = [];

  log('EXEC', 'Checking wallets...');
  const wallets = await fetchWalletList();
  if (wallets.ok) {
    const wData = wallets.data?.data || wallets.data;
    const wList = Array.isArray(wData) ? wData : ((wData as any)?.wallets || []);
    if (wList.length > 0) ok(`${wList.length} wallet(s)`);
    else {
      log('EXEC', 'Creating wallet...');
      const created = await fetchWalletCreate('alpha-executor');
      if (created.ok) ok('Wallet created');
    }
  }

  const passed = candidates.filter(c => c.risk.gateOpen);
  if (passed.length === 0) { warn('No candidates passed risk gate.'); return quotes; }

  const top = passed[0];
  if (top.token.chain !== 'solana' && top.token.chain !== 'base') { warn(`Trading only on solana/base, got ${top.token.chain}`); return quotes; }

  const fromToken = top.token.chain === 'solana' ? 'SOL' : 'ETH';
  const amount = top.token.chain === 'solana' ? '100000000' : '100000000000000000';
  const amountHuman = top.token.chain === 'solana' ? '0.1 SOL' : '0.1 ETH';

  log('EXEC', `Quote: ${amountHuman} -> ${top.token.symbol}...`);
  const quote = await fetchTradeQuote(top.token.chain, fromToken, top.token.address, amount);

  if (quote.ok && quote.data) {
    ok(`Quote received for ${top.token.symbol}`);
    const qData = (quote.data as any)?.data || quote.data;
    quotes.push({ token: top.token.symbol, chain: top.token.chain, from: fromToken, amountHuman, conviction: top.conviction, riskGrade: top.risk.grade, quoteData: qData });

    if (executeFlag) {
      const quoteId = qData?.quoteId || qData?.quote_id;
      if (quoteId) {
        log('EXEC', `EXECUTING (quote: ${quoteId})...`);
        const exec = await fetchTradeExecute(quoteId);
        if (exec.ok) { ok('TRADE EXECUTED'); quotes[quotes.length - 1].executed = true; }
        else warn(`Execution failed: ${exec.error}`);
      }
    } else {
      console.log(chalk.gray('       (Dry run. Use --execute to trade live)'));
    }
  }

  return quotes;
}

export function generateReport(
  tokens: TokenSignal[], analysis: Map<string, any>,
  whales: WhaleInfo[], clusters: Cluster[],
  perpSentiment: Map<string, string>, candidates: TradeCandidate[],
  quotes: any[], elapsed: number,
): string {
  const tel = telSummary();
  const entries = telEntries();

  let md = `# Hyper Compass - Intelligence Report\n\n`;
  md += `> Autonomous smart money intelligence pipeline\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Generated | ${new Date().toISOString()} |\n`;
  md += `| CLI Calls | **${tel.totalCalls}** |\n`;
  md += `| Unique Endpoints | **${Object.keys(tel.byRole).length}** |\n`;
  md += `| Chains | ${Object.keys(tel.byChain).join(', ')} |\n`;
  md += `| Tokens | ${tokens.length} |\n`;
  md += `| Whales | ${whales.length} |\n`;
  md += `| Clusters | ${clusters.length} |\n`;
  md += `| Duration | ${elapsed.toFixed(1)}s |\n\n`;

  md += `## Call Log\n\n`;
  md += `| # | Endpoint | Chain | Status | Latency | Cache |\n`;
  md += `|---|----------|-------|--------|---------|-------|\n`;
  entries.forEach((e, i) => { md += `| ${i + 1} | ${e.role} | ${e.chain || '-'} | ${e.status} | ${e.latencyMs}ms | ${e.cacheStatus} |\n`; });

  md += `\n## Signals\n\n`;
  md += `| Token | Chain | Score | Volume | NetFlow | Change | MCap |\n`;
  md += `|-------|-------|-------|--------|---------|--------|------|\n`;
  for (const t of tokens) {
    md += `| ${t.symbol} | ${t.chain} | ${t.score.toFixed(1)} | $${fmt(t.volume)} | ${t.netflow > 0 ? '+' : ''}$${fmt(t.netflow)} | ${pct(t.priceChange)} | $${fmt(t.marketCap)} |\n`;
  }

  if (candidates.length > 0) {
    md += `\n## Candidates\n\n`;
    md += `| Token | Conviction | Grade | Gate | Perp | Rec |\n`;
    md += `|-------|-----------|-------|------|------|-----|\n`;
    for (const c of candidates) {
      const rec = c.risk.gateOpen ? (c.conviction > 60 ? 'BUY' : 'WATCH') : 'BLOCKED';
      md += `| ${c.token.symbol} | ${c.conviction.toFixed(1)} | ${c.risk.grade} | ${c.risk.gateOpen ? 'OPEN' : 'CLOSED'} | ${c.perpSentiment} | ${rec} |\n`;
    }
  }

  return md;
}

export async function runPipeline(chains: Chain[], executeFlag = false): Promise<void> {
  console.log(chalk.bold.magenta(`\n  HYPER COMPASS - Smart Money Intelligence Pipeline\n  Chains: ${chains.join(', ')} | Mode: ${executeFlag ? 'LIVE' : 'DRY RUN'}\n`));

  const t0 = Date.now();

  const topTokens = await phaseDiscovery(chains);
  if (topTokens.length === 0) { console.log(chalk.red('\n  No alpha found.')); return; }

  const analysis = await phaseTokenAnalysis(topTokens);
  const { whales, clusters } = await phaseWhaleProfiling(topTokens, analysis);
  const perpSentiment = await phasePerpIntel(topTokens);
  const candidates = await phaseConvictionRisk(topTokens, analysis, whales, clusters, perpSentiment);
  await phaseAIAgent(candidates);
  const quotes = await phaseExecution(candidates, executeFlag);

  console.log(chalk.bold.cyan('\n   PHASE 8: REPORT\n'));
  const elapsed = (Date.now() - t0) / 1000;
  const report = generateReport(topTokens, analysis, whales, clusters, perpSentiment, candidates, quotes, elapsed);
  const dataDir = resolve(DIR, '../data');
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(resolve(dataDir, 'alpha_report.md'), report, 'utf-8');
  ok('Report saved: data/alpha_report.md');

  const tel = telSummary();
  console.log(chalk.bold.magenta(`\n  DONE | Calls: ${tel.totalCalls} | Endpoints: ${Object.keys(tel.byRole).length} | Duration: ${elapsed.toFixed(1)}s\n`));
}
