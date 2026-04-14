import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import type { AIAnalysis } from '../lib/ai-analyzer.js';

interface AIPaneProps {
  analysis: AIAnalysis | null;
  loading: boolean;
}

const FRAMES = ['|', '/', '-', '\\'];

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(Math.max(v, lo), hi);

const convictionBar = (c: number): string => {
  const n = clamp(Math.round(c), 0, 100);
  const filled = Math.round(n / 10);
  const bar = `${'\u2588'.repeat(filled)}${'\u2591'.repeat(10 - filled)}`;
  if (n >= 80) return chalk.green(bar);
  if (n >= 60) return chalk.yellow(bar);
  return chalk.red(bar);
};

export function AIPane({ analysis, loading }: AIPaneProps): React.JSX.Element {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!loading) return undefined;
    const id = setInterval(() => setFrame(f => (f + 1) % FRAMES.length), 90);
    return () => clearInterval(id);
  }, [loading]);

  return (
    <Box borderStyle="round" borderColor="green" paddingX={1} flexDirection="column" flexGrow={1} minHeight={16}>
      <Text bold color="green">AI Trade Thesis</Text>
      {loading ? (
        <Text color="yellow">{FRAMES[frame]} Generating cross-chain thesis...</Text>
      ) : analysis ? (
        <>
          <Text wrap="wrap">{analysis.thesis}</Text>
          <Text>Conviction {analysis.conviction}/100 {convictionBar(analysis.conviction)}</Text>
          <Text dimColor>Horizon: {analysis.timeHorizon}</Text>
          <Text color="cyan">Catalysts</Text>
          {analysis.catalysts.length === 0
            ? <Text color="gray">None identified.</Text>
            : analysis.catalysts.slice(0, 3).map((c, i) => <Text key={`c-${i}`}>- {c}</Text>)
          }
          <Text color="red">Risks</Text>
          {analysis.risks.length === 0
            ? <Text color="gray">No explicit risks.</Text>
            : analysis.risks.slice(0, 3).map((r, i) => <Text key={`r-${i}`}>- {r}</Text>)
          }
        </>
      ) : (
        <Text color="gray">No AI analysis available yet.</Text>
      )}
    </Box>
  );
}
