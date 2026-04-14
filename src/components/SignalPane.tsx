import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import type { AlphaSignal } from '../lib/signal-engine.js';

interface SignalPaneProps {
  signals: AlphaSignal[];
}

const fit = (s: string, w: number): string =>
  s.length <= w ? s.padEnd(w) : `${s.slice(0, Math.max(0, w - 1))}\u2026`;

const scoreColor = (s: number) => {
  if (s >= 80) return chalk.greenBright;
  if (s >= 65) return chalk.green;
  if (s >= 50) return chalk.yellow;
  if (s >= 35) return chalk.hex('#ff9f1c');
  return chalk.red;
};

const trendArrow = (sig: AlphaSignal): string => {
  if (sig.classification === 'STRONG_BUY' || sig.classification === 'BUY') return chalk.green('^');
  if (sig.classification === 'WATCH') return chalk.yellow('>');
  return chalk.red('v');
};

export function SignalPane({ signals }: SignalPaneProps): React.JSX.Element {
  const ranked = signals.slice(0, 8);

  return (
    <Box borderStyle="round" borderColor="magenta" paddingX={1} flexDirection="column" flexGrow={1} minHeight={14}>
      <Text bold color="magenta">Ranked Convergence Signals</Text>
      <Text dimColor>
        {fit('RK', 3)} {fit('TOKEN', 8)} {fit('CHAINS', 18)} {fit('CONV', 6)} {fit('AI', 4)} {fit('T', 1)}
      </Text>
      {ranked.length === 0 ? (
        <Text color="gray">No ranked signals this cycle.</Text>
      ) : (
        ranked.map((sig, i) => (
          <Text key={sig.id}>
            {fit(String(i + 1), 3)} {fit(sig.symbol, 8)} {fit(sig.chains.join(','), 18)} {scoreColor(sig.convergenceScore)(fit(String(sig.convergenceScore), 6))} {scoreColor(sig.aiConviction)(fit(String(sig.aiConviction), 4))} {trendArrow(sig)}
          </Text>
        ))
      )}
    </Box>
  );
}
