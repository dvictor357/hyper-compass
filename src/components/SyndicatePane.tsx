import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

export interface SyndicateDisplay {
  id: string;
  token: string;
  wallets: number;
  chains: string[];
  totalValueUsd: number;
  coordinationScore: number;
  controller: string;
  windowMinutes: number;
}

interface SyndicatePaneProps {
  syndicates: SyndicateDisplay[];
}

const fit = (s: string, w: number): string =>
  s.length <= w ? s.padEnd(w) : `${s.slice(0, Math.max(0, w - 1))}\u2026`;

const fmtUsd = (v: number): string => {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

const shortAddr = (a: string): string =>
  a.length <= 10 ? a : `${a.slice(0, 6)}..${a.slice(-4)}`;

const scoreColor = (s: number) => {
  if (s >= 85) return chalk.redBright;
  if (s >= 70) return chalk.hex('#ff6b6b');
  if (s >= 50) return chalk.yellow;
  if (s >= 30) return chalk.hex('#ff9f1c');
  return chalk.gray;
};

const scoreTag = (s: number): string => {
  if (s >= 85) return 'EXTREME';
  if (s >= 70) return 'HIGH';
  if (s >= 50) return 'MODERATE';
  if (s >= 30) return 'LOW';
  return 'WEAK';
};

export function SyndicatePane({ syndicates }: SyndicatePaneProps): React.JSX.Element {
  const top = syndicates.slice(0, 6);

  return (
    <Box borderStyle="round" borderColor="red" paddingX={1} flexDirection="column" flexGrow={1} minHeight={14}>
      <Text bold color="red">Syndicate Detection</Text>
      <Text dimColor>
        {fit('#', 2)} {fit('TOKEN', 6)} {fit('WALLETS', 7)} {fit('CHAINS', 14)} {fit('VALUE', 8)} {fit('COORD', 9)} {fit('CTRL', 12)}
      </Text>
      {top.length === 0 ? (
        <Text color="gray">Scanning for coordinated groups...</Text>
      ) : (
        top.map((syn, i) => {
          const color = scoreColor(syn.coordinationScore);
          const tag = scoreTag(syn.coordinationScore);
          return (
            <Text key={syn.id}>
              {fit(String(i + 1), 2)} {chalk.bold(fit(syn.token, 6))} {fit(`${syn.wallets}w`, 7)} {fit(syn.chains.join(','), 14)} {chalk.green(fit(fmtUsd(syn.totalValueUsd), 8))} {color(fit(`${syn.coordinationScore} ${tag}`, 9))} {chalk.dim(fit(shortAddr(syn.controller), 12))}
            </Text>
          );
        })
      )}
      {syndicates.length > 0 && (
        <Text dimColor>{syndicates.length} syndicate{syndicates.length !== 1 ? 's' : ''} | window: {syndicates[0]?.windowMinutes ?? 30}min</Text>
      )}
    </Box>
  );
}
