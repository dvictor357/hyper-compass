# hyper-compass

Autonomous cross-chain smart money intelligence pipeline with AI-powered signal analysis.

Detects whale accumulation, syndicate coordination, and Polymarket divergence across 8 chains using the Nansen CLI, then synthesizes actionable trade theses via LLM.

## Architecture

```
src/
  index.tsx              CLI entry point (Commander + Ink)
  app.tsx                6-pane TUI dashboard with live scan cycle
  alpha-pipeline.ts      8-phase orchestration pipeline
  components/
    FlowPane.tsx         Multi-chain netflow table
    SyndicatePane.tsx    Syndicate detection display
    SignalPane.tsx       Ranked convergence signals
    DivergencePane.tsx   SM vs Polymarket divergence
    AIPane.tsx           AI trade thesis with loading spinner
    StatsPane.tsx        Performance metrics dashboard
  lib/
    cache.ts             TTL cache for API responses
    telemetry.ts         Call recording and latency tracking
    nansen.ts            Nansen CLI wrapper (30+ endpoints)
    mock.ts              Mock data for all endpoints
    scanner.ts           Multi-chain scanner with accumulation detection
    convergence.ts       Cross-chain convergence scoring
    syndicate.ts         Temporal clustering algorithm
    syndicate-scanner.ts Syndicate orchestrator
    polymarket.ts        Gamma API + divergence calculation
    signal-engine.ts     Composite scoring + classification
    ai-analyzer.ts       OpenRouter LLM integration
    tracker.ts           Signal persistence + price tracking
    accuracy.ts          Historical accuracy engine
    telegram.ts          Telegram bot (/start, /subscribe, /status, /scan)
web/                     Next.js 16 dashboard (4-tab, 3D whale network)

284 tests across 20 test files
```

## 8-Phase Pipeline

1. **Discovery** - Multi-chain token screener + netflow scan
2. **Accumulation Detection** - Aggregate cross-chain smart money positions
3. **Convergence Scoring** - Score tokens appearing on multiple chains
4. **Syndicate Detection** - Temporal clustering of coordinated wallets
5. **Divergence Check** - Compare SM positioning vs Polymarket odds
6. **AI Analysis** - LLM-generated trade theses via OpenRouter
7. **Signal Ranking** - Composite scoring + classification (STRONG_BUY/BUY/WATCH/WEAK)
8. **Tracking** - Signal persistence + 24h/72h/7d performance monitoring

## Quick Start

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Run in mock mode (no API keys needed)
NANSEN_MOCK=true bun run dev

# Run with real Nansen CLI
nansen auth login
bun run dev

# Run single pipeline execution
bun run pipeline

# Run tests
bun run test

# Type check
bun run lint
```

## CLI Options

```
hyper-compass [options]

  --mock             Enable mock data mode
  --chains <list>    Comma-separated chain list (default: all)
  --interval <sec>   Scan interval in seconds (default: 60)
  --no-ai            Disable AI analysis
```

## Environment Variables

```
NANSEN_MOCK=true              Enable mock mode (no real API calls)
OPENROUTER_API_KEY=<key>      Required for AI analysis (get one at openrouter.ai/keys)
AI_MODEL=<model>              OpenRouter model (default: anthropic/claude-sonnet-4)
TELEGRAM_BOT_TOKEN=<token>    Telegram bot token for alerts
```

## Web Dashboard

```bash
cd web
bun install
bun run dev
```

4-tab dashboard:
- **Overview** - Token cards + 3D whale network + coordination clusters
- **3D Whale Network** - Interactive force-directed graph (Three.js)
- **Risk Analysis** - 8-factor risk radar per token
- **Pipeline Status** - Phase execution timeline + endpoint distribution

## Supported Chains

Ethereum, Solana, Base, Arbitrum, Polygon, Optimism, Avalanche, BNB

## Tech Stack

- TypeScript 5.9, Bun 1.x runtime, ES2022 with NodeNext modules
- Ink 5 + React 18 (TUI), Commander (CLI)
- Next.js 16 + React 19 + Tailwind 4 + Three.js (Web dashboard)
- Vitest 3 via Bun, OpenRouter (LLM)
- Nansen CLI (data source)

## License

MIT
