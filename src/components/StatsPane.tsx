import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import type { Stats } from '../lib/tracker.js';
import type { TelemetrySummary } from '../lib/telemetry.js';

interface StatsPaneProps {
  stats: Stats;
  telemetry: TelemetrySummary & { creditsUsed: number | null };
}

const colorFor = (v: number, threshold = 0) => {
  if (v > threshold) return chalk.green;
  if (v === threshold) return chalk.yellow;
  return chalk.red;
};

const pct = (v: number): string => `${v.toFixed(1)}%`;

export function StatsPane({ stats, telemetry }: StatsPaneProps): React.JSX.Element {
  return (
    <Box borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column" flexGrow={1} minHeight={16}>
      <Text bold color="yellow">Performance Dashboard</Text>
      <Text>Total signals tracked: {stats.totalSignals}</Text>
      <Text>Hit rate: {colorFor(stats.winRate)(pct(stats.winRate))}</Text>
      <Text>Avg return: {colorFor(stats.avgReturn72h)(pct(stats.avgReturn72h))}</Text>
      <Text>API calls made: {telemetry.totalCalls}</Text>
      <Text>Credits used: {telemetry.creditsUsed === null ? 'N/A' : telemetry.creditsUsed}</Text>
      <Text dimColor>
        Resolved {stats.resolved} | Pending {stats.pending} | Avg latency {telemetry.avgLatencyMs}ms
      </Text>
      <Text dimColor>
        Cache hit rate {telemetry.cacheHitRate}% | Uptime {telemetry.uptimeSeconds}s
      </Text>
    </Box>
  );
}
