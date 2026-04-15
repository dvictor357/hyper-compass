import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { AIPane } from './components/AIPane.js';
import { DivergencePane, type DivergenceDisplay } from './components/DivergencePane.js';
import { FlowPane } from './components/FlowPane.js';
import { SignalPane } from './components/SignalPane.js';
import { StatsPane } from './components/StatsPane.js';
import { SyndicatePane, type SyndicateDisplay } from './components/SyndicatePane.js';
import { analyzeBatch, getMockAnalysis, type AIAnalysis } from './lib/ai-analyzer.js';
import { detectConvergence, type ConvergenceSignal } from './lib/convergence.js';
import { CHAINS, type Chain } from './lib/providers/types.js';
import { provider } from './lib/providers/index.js';
import { findAccumulations, scanAll, type ChainScan } from './lib/scanner.js';
import { createSignal, rankSignals, type AlphaSignal } from './lib/signal-engine.js';
import { checkPerformance, getStats, loadHistory, trackSignal, type Stats } from './lib/tracker.js';
import { summary, type TelemetrySummary } from './lib/telemetry.js';

const MOCK_SYNDICATES: SyndicateDisplay[] = [
  {
    id: 'SYN-001',
    token: 'ETH',
    wallets: 12,
    chains: ['ethereum', 'arbitrum', 'base', 'optimism'],
    totalValueUsd: 5_240_000,
    coordinationScore: 92,
    controller: '0x28C6c06298d514Db089934071355E5743bf21d60',
    windowMinutes: 18,
  },
  {
    id: 'SYN-002',
    token: 'LINK',
    wallets: 8,
    chains: ['ethereum', 'arbitrum', 'polygon'],
    totalValueUsd: 1_830_000,
    coordinationScore: 78,
    controller: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    windowMinutes: 24,
  },
  {
    id: 'SYN-003',
    token: 'PEPE',
    wallets: 6,
    chains: ['ethereum', 'base'],
    totalValueUsd: 920_000,
    coordinationScore: 65,
    controller: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    windowMinutes: 12,
  },
  {
    id: 'SYN-004',
    token: 'SOL',
    wallets: 5,
    chains: ['solana'],
    totalValueUsd: 2_100_000,
    coordinationScore: 58,
    controller: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    windowMinutes: 27,
  },
  {
    id: 'SYN-005',
    token: 'JUP',
    wallets: 4,
    chains: ['solana'],
    totalValueUsd: 680_000,
    coordinationScore: 45,
    controller: 'DYw5HsfYFmNmCPWMqkqPATCB5C9P4q6WaLcmE7bxCJrS',
    windowMinutes: 30,
  },
];

const MOCK_DIVERGENCES: DivergenceDisplay[] = [
  {
    token: 'ETH',
    smDirection: 'bullish',
    smConfidence: 87,
    polySentiment: 42,
    divergenceScore: 78,
    marketQuestion: 'Will ETH be above $4000 by June 2026?',
  },
  {
    token: 'SOL',
    smDirection: 'bullish',
    smConfidence: 72,
    polySentiment: 55,
    divergenceScore: 52,
    marketQuestion: 'Will SOL reach $300 by Q3 2026?',
  },
  {
    token: 'BTC',
    smDirection: 'bearish',
    smConfidence: 61,
    polySentiment: 78,
    divergenceScore: 64,
    marketQuestion: 'Will BTC hit $120K by May 2026?',
  },
  {
    token: 'LINK',
    smDirection: 'bullish',
    smConfidence: 80,
    polySentiment: 35,
    divergenceScore: 71,
    marketQuestion: 'Will LINK be above $25 by July 2026?',
  },
];

type TelemetryReceipt = TelemetrySummary & { creditsUsed: number | null };

interface AppProps {
  chains?: Chain[];
  intervalMs?: number;
  noAI?: boolean;
}

async function fetchCreditsUsed(initialRef: React.MutableRefObject<number | null>): Promise<number | null> {
  try {
    const res = await provider().fetchAccount();
    const remaining = parseInt(String((res.data?.data as any)?.credits_remaining ?? ''), 10);
    if (!Number.isFinite(remaining)) return null;
    if (initialRef.current === null) initialRef.current = remaining;
    return Math.max(0, initialRef.current - remaining);
  } catch {
    return null;
  }
}

const fmtCountdown = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export function App({ chains, intervalMs = 60_000, noAI = false }: AppProps): React.JSX.Element {
  const [scanResults, setScanResults] = useState<ChainScan[]>([]);
  const [convergenceSignals, setConvergenceSignals] = useState<ConvergenceSignal[]>([]);
  const [rankedSignals, setRankedSignals] = useState<AlphaSignal[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<AIAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [stats, setStats] = useState<Stats>(getStats());
  const [syndicates, setSyndicates] = useState<SyndicateDisplay[]>([]);
  const [divergences, setDivergences] = useState<DivergenceDisplay[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryReceipt>({ ...summary(), creditsUsed: null });
  const [historyReady, setHistoryReady] = useState(false);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [nextScanAt, setNextScanAt] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const initialCreditsRef = useRef<number | null>(null);
  const trackedRef = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      await loadHistory();
      if (!active) return;
      setStats(getStats());
      setHistoryReady(true);
    };
    void bootstrap();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!historyReady) return undefined;
    let active = true;

    const runCycle = async () => {
      setError(null);
      setLoadingAnalysis(true);

      try {
        const scans = await scanAll(chains);
        if (!active) return;
        setScanResults(scans);

        if (provider().isMock()) {
          setSyndicates(MOCK_SYNDICATES);
          setDivergences(MOCK_DIVERGENCES);
        }

        const accumulations = findAccumulations(scans);
        const convergence = detectConvergence(accumulations);
        setConvergenceSignals(convergence);

        let analyses: AIAnalysis[] = [];
        if (convergence.length > 0) {
          if (noAI || provider().isMock()) {
            analyses = convergence.map(s => getMockAnalysis(s));
          } else {
            analyses = await analyzeBatch(convergence, scans);
          }
        }

        if (!active) return;

        const byId = new Map(analyses.map(a => [a.signalId, a]));
        const created = convergence
          .map(s => {
            const a = byId.get(s.id);
            return a ? createSignal(s, a) : null;
          })
          .filter((s): s is AlphaSignal => s !== null);
        const ranked = rankSignals(created);
        setRankedSignals(ranked);
        setLatestAnalysis(analyses[0] ?? null);

        for (const sig of ranked.slice(0, 5)) {
          const key = `${sig.symbol}:${sig.detectedAt}:${sig.chains.join(',')}`;
          if (trackedRef.current.has(key)) continue;
          trackedRef.current.add(key);
          await trackSignal(sig);
        }

        await checkPerformance();
        const creditsUsed = await fetchCreditsUsed(initialCreditsRef);

        if (!active) return;

        setStats(getStats());
        setTelemetry({ ...summary(), creditsUsed });
        setLastScanAt(Date.now());
        setNextScanAt(Date.now() + intervalMs);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Scan pipeline failed');
        setTelemetry(cur => ({ ...summary(), creditsUsed: cur.creditsUsed }));
      } finally {
        if (active) setLoadingAnalysis(false);
      }
    };

    void runCycle();
    const id = setInterval(() => { void runCycle(); }, intervalMs);
    return () => { active = false; clearInterval(id); };
  }, [chains, historyReady, intervalMs, noAI]);

  const countdown = useMemo(() => fmtCountdown(nextScanAt - now), [nextScanAt, now]);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="cyan">{chalk.bold('hyper-compass')}</Text>
        <Text color="yellow">Next scan in {countdown}</Text>
      </Box>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text dimColor>
          Chains {(chains ?? []).length > 0 ? chains?.join(', ') : 'all'} | Signals {rankedSignals.length} | Convergence {convergenceSignals.length} | Syndicates {syndicates.length} | Divergences {divergences.filter(d => d.divergenceScore >= 50).length}
        </Text>
        <Text dimColor>
          {lastScanAt ? `Last scan ${new Date(lastScanAt).toLocaleTimeString()}` : 'Bootstrapping'}
        </Text>
      </Box>
      {error && (
        <Box marginBottom={1}>
          <Text color="red">Pipeline error: {error}</Text>
        </Box>
      )}
      <Box flexDirection="row" marginBottom={1}>
        <Box flexGrow={1} marginRight={1}>
          <FlowPane scans={scanResults} />
        </Box>
        <Box flexGrow={1}>
          <SyndicatePane syndicates={syndicates} />
        </Box>
      </Box>
      <Box flexDirection="row" marginBottom={1}>
        <Box flexGrow={1} marginRight={1}>
          <SignalPane signals={rankedSignals} />
        </Box>
        <Box flexGrow={1}>
          <DivergencePane divergences={divergences} />
        </Box>
      </Box>
      <Box flexDirection="row">
        <Box flexGrow={1} marginRight={1}>
          <AIPane analysis={latestAnalysis} loading={loadingAnalysis} />
        </Box>
        <Box flexGrow={1}>
          <StatsPane stats={stats} telemetry={telemetry} />
        </Box>
      </Box>
    </Box>
  );
}
