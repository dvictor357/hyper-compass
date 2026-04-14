import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

export interface DivergenceDisplay {
  token: string;
  smDirection: 'bullish' | 'bearish';
  smConfidence: number;
  polySentiment: number;
  divergenceScore: number;
  marketQuestion: string;
}

interface DivergencePaneProps {
  divergences: DivergenceDisplay[];
}

const fit = (s: string, w: number): string =>
  s.length <= w ? s.padEnd(w) : `${s.slice(0, Math.max(0, w - 1))}\u2026`;

const bar = (value: number, max: number, width: number, color: (s: string) => string): string => {
  const filled = Math.round((value / max) * width);
  return color('\u2588'.repeat(filled)) + chalk.gray('\u2591'.repeat(width - filled));
};

const dirArrow = (dir: 'bullish' | 'bearish'): string =>
  dir === 'bullish' ? chalk.green('\u25B2 BULL') : chalk.red('\u25BC BEAR');

const divColor = (score: number) => {
  if (score >= 70) return chalk.redBright;
  if (score >= 50) return chalk.yellow;
  if (score >= 30) return chalk.hex('#ff9f1c');
  return chalk.gray;
};

export function DivergencePane({ divergences }: DivergencePaneProps): React.JSX.Element {
  const top = divergences.slice(0, 5);

  return (
    <Box borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column" flexGrow={1} minHeight={14}>
      <Text bold color="yellow">SM vs Polymarket Divergence</Text>
      {top.length === 0 ? (
        <Text color="gray">Fetching prediction market data...</Text>
      ) : (
        top.map((d) => {
          const dc = divColor(d.divergenceScore);
          return (
            <Box key={d.token} flexDirection="column" marginBottom={0}>
              <Text>
                {chalk.bold(fit(d.token, 6))} {dirArrow(d.smDirection)} {dc(`DIV:${d.divergenceScore}`)} {chalk.dim(fit(d.marketQuestion, 40))}
              </Text>
              <Text>
                {'  SM  '}{bar(d.smConfidence, 100, 15, d.smDirection === 'bullish' ? chalk.green : chalk.red)} {d.smConfidence}%{'  '}
                {'POLY '}{bar(d.polySentiment, 100, 15, chalk.blue)} {d.polySentiment}%
              </Text>
            </Box>
          );
        })
      )}
      {divergences.length > 0 && (
        <Text dimColor>{divergences.filter(d => d.divergenceScore >= 50).length} high-divergence signals</Text>
      )}
    </Box>
  );
}
