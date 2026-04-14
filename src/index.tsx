import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';

const program = new Command();

program
  .name('hyper-compass')
  .description('Autonomous smart money intelligence pipeline')
  .option('--mock', 'Enable mock data mode')
  .option('--chains <chains>', 'Comma-separated chain list')
  .option('--interval <seconds>', 'Scan interval', '60')
  .option('--no-ai', 'Disable AI analysis');

program.parse(process.argv);

const options = program.opts<{
  mock?: boolean;
  chains?: string;
  interval: string;
  ai: boolean;
}>();

if (options.mock || process.env.NANSEN_MOCK === 'true') {
  process.env.NANSEN_MOCK = 'true';
}

const intervalMs = Number.parseInt(options.interval, 10) * 1_000;
if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
  throw new Error(`Invalid --interval: ${options.interval}`);
}

const { App } = await import('./app.js');
const { CHAINS } = await import('./lib/nansen.js');

const chains = options.chains
  ? options.chains.split(',').map(c => c.trim()).filter(Boolean)
  : undefined;

if (chains) {
  const invalid = chains.filter(c => !CHAINS.includes(c as any));
  if (invalid.length > 0) throw new Error(`Unsupported chains: ${invalid.join(', ')}`);
}

const app = render(
  React.createElement(App, {
    chains: chains as any,
    intervalMs,
    noAI: !options.ai,
  }),
);

const shutdown = (): void => { app.unmount(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
