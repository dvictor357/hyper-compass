# hyper-compass

Autonomous cross-chain smart money intelligence pipeline with AI-powered signal analysis.

Detects whale accumulation, syndicate coordination, and Polymarket divergence across 5 chains using free/open-source data providers (DexScreener, Hyperliquid, Moralis, Arkham, Jupiter, 1inch), with optional Nansen CLI support, then synthesizes actionable trade theses via LLM.

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
    nansen.ts            Nansen CLI wrapper (legacy, kept for backward compat)
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
    providers/
      types.ts           DataSourceProvider interface + Chain type
      registry.ts        Provider singleton registry
      index.ts           Auto-init (free/nansen switch via DATA_PROVIDER)
      nansen.ts          Nansen CLI provider (optional)
      free-provider.ts   Free provider composition layer
      dexscreener.ts     Token prices, volume, liquidity, DEX trades
      smart-money.ts     SQLite smart money engine (seed/track/aggregate)
      moralis.ts         Token holders, wallet balances, TX history
      arkham.ts          Wallet labels & entity identification
      hyperliquid.ts     Perp data: OI, funding, long/short
      jupiter.ts         Solana swap quotes + execution
      oneinch.ts         EVM swap quotes + execution
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

# Copy environment config
cp .env.example .env

# Run in mock mode (no API keys needed)
NANSEN_MOCK=true bun run dev

# Run with free providers (needs API keys in .env)
bun run dev

# Run with Nansen CLI (backward compat)
DATA_PROVIDER=nansen bun run dev

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
# ── Provider Selection ──────────────────────────────────────
DATA_PROVIDER=free              "free" (default) or "nansen"

# ── AI Analysis ─────────────────────────────────────────────
OPENROUTER_API_KEY=<key>        Required for AI analysis (get one at openrouter.ai/keys)
AI_MODEL=<model>                OpenRouter model (default: anthropic/claude-sonnet-4)

# ── Free Providers ──────────────────────────────────────────
MORALIS_API_KEY=<key>           Token holders, wallet data (free: 3k calls/day)
ARKHAM_API_KEY=<key>            Wallet labels (optional)
ONEINCH_API_KEY=<key>           EVM swap execution (optional)

# ── Smart Money Engine ──────────────────────────────────────
SMART_MONEY_SEED=true           Seed wallets on startup
SMART_MONEY_DB=data/smart-money.db  SQLite DB path

# ── Mock Mode ───────────────────────────────────────────────
NANSEN_MOCK=true                Enable mock mode (no real API calls)

# ── Telegram Bot (optional) ─────────────────────────────────
TELEGRAM_BOT_TOKEN=<token>
TELEGRAM_CHAT_ID=<chat_id>
```

## Data Providers

| Provider | Data | Auth | Free Tier |
|---|---|---|---|
| **DexScreener** | Token prices, volume, liquidity, DEX trades | None | ~300 req/min |
| **Hyperliquid** | Perp OI, funding rates, long/short | None | Unlimited |
| **Jupiter** | Solana swap quotes + execution | None | Unlimited |
| **Moralis** | Token holders, wallet balances, TX history | API key | 3,000 calls/day |
| **Arkham** | Wallet labels & entity identification | API key (optional) | Free tier |
| **1inch** | EVM swap quotes + execution | API key | 50 req/min |
| **Polymarket** | Prediction market sentiment | None | Unlimited |
| **Nansen CLI** | Full smart money data (optional fallback) | CLI auth | Paid |

### Smart Money Engine

The free provider includes a SQLite-based smart money tracking engine (`bun:sqlite`):

1. **Seed** - Populate known profitable wallets from Birdeye/Dune
2. **Track** - Monitor wallet DEX activity via Moralis/RPC
3. **Aggregate** - Compute per-token netflow (buy volume - sell volume)
4. **Output** - Nansen-compatible format so downstream code works unchanged

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

Ethereum, Solana, Base, BNB, Hyperliquid

## Tech Stack

- TypeScript 5.9, Bun 1.x runtime, ESNext with bundler module resolution
- Ink 5 + React 18 (TUI), Commander (CLI)
- Next.js 16 + React 19 + Tailwind 4 + Three.js (Web dashboard)
- Vitest 3 via Bun, OpenRouter (LLM), bun:sqlite (smart money DB)
- DexScreener, Hyperliquid, Moralis, Arkham, Jupiter, 1inch (data providers)

## License

MIT
