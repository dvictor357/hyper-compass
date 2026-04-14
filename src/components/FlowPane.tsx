import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import type { ChainScan } from '../lib/scanner.js';

interface FlowRow {
  chain: string;
  token: string;
  dir: 'IN' | 'OUT';
  amount: number;
  wallets: number;
}

const fmtUsd = (v: number): string => {
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

const fit = (s: string, w: number): string =>
  s.length <= w ? s.padEnd(w) : `${s.slice(0, Math.max(0, w - 1))}\u2026`;

const extractRows = (scans: ChainScan[]): FlowRow[] =>
  scans
    .flatMap((scan) =>
      scan.netflow.map((item: any) => {
        const raw24 = parseFloat(item.net_flow_24h_usd ?? item.netFlow24h ?? 0);
        const raw7d = parseFloat(item.net_flow_7d_usd ?? item.netFlow7d ?? 0);
        const raw30 = parseFloat(item.net_flow_30d_usd ?? item.netFlow30d ?? 0);
        const amount = raw24 !== 0 ? raw24 : raw7d !== 0 ? raw7d : raw30;
        const wallets = parseInt(item.trader_count ?? item.traderCount ?? item.smart_money_count ?? '0', 10);

        return {
          chain: scan.chain,
          token: String(item.symbol ?? item.token_symbol ?? item.name ?? '???').toUpperCase(),
          dir: amount >= 0 ? 'IN' as const : 'OUT' as const,
          amount,
          wallets: Number.isFinite(wallets) ? wallets : 0,
        };
      }),
    )
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 8);

interface FlowPaneProps {
  scans: ChainScan[];
}

export function FlowPane({ scans }: FlowPaneProps): React.JSX.Element {
  const rows = extractRows(scans);

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column" flexGrow={1} minHeight={14}>
      <Text bold color="cyan">Multi-Chain Netflow</Text>
      <Text dimColor>
        {fit('CHAIN', 10)} {fit('TOKEN', 8)} {fit('DIR', 5)} {fit('AMOUNT', 12)} {fit('SM', 4)}
      </Text>
      {rows.length === 0 ? (
        <Text color="gray">No flow data yet.</Text>
      ) : (
        rows.map((row, i) => {
          const dirColor = row.dir === 'IN' ? chalk.green : chalk.red;
          return (
            <Text key={`${row.chain}-${row.token}-${i}`}>
              {fit(row.chain, 10)} {fit(row.token, 8)} {dirColor(fit(row.dir, 5))} {dirColor(fit(fmtUsd(row.amount), 12))} {fit(String(row.wallets), 4)}
            </Text>
          );
        })
      )}
    </Box>
  );
}
