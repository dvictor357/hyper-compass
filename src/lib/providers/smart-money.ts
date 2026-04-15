import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { record, classifyRole } from '../telemetry.js';
import { TTLCache } from '../cache.js';
import type { Chain, ProviderResult } from './types.js';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'data');
const DB_PATH = join(DIR, 'smart-money.db');
const cache = new TTLCache(60_000);

let db: any = null;
let dbInit: Promise<any> | null = null;

async function getDb(): Promise<any> {
  if (db) return db;
  if (dbInit) return dbInit;
  dbInit = (async () => {
    const { Database } = await import('bun:sqlite');
    mkdirSync(DIR, { recursive: true });
    const d = new Database(DB_PATH, { create: true });
    d.exec('PRAGMA journal_mode=WAL');
    d.exec('PRAGMA synchronous=NORMAL');
    d.exec(`
      CREATE TABLE IF NOT EXISTS smart_wallets (
        address TEXT PRIMARY KEY,
        chain TEXT NOT NULL,
        label TEXT,
        pnl_30d REAL DEFAULT 0,
        source TEXT,
        first_seen INTEGER,
        last_active INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS wallet_trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_address TEXT NOT NULL,
        token_address TEXT,
        token_symbol TEXT,
        chain TEXT NOT NULL,
        side TEXT NOT NULL,
        value_usd REAL,
        tx_hash TEXT,
        block_timestamp INTEGER,
        processed_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS token_netflow (
        token_symbol TEXT NOT NULL,
        chain TEXT NOT NULL,
        netflow_1h REAL DEFAULT 0,
        netflow_24h REAL DEFAULT 0,
        netflow_7d REAL DEFAULT 0,
        netflow_30d REAL DEFAULT 0,
        trader_count INTEGER DEFAULT 0,
        buy_volume REAL DEFAULT 0,
        sell_volume REAL DEFAULT 0,
        updated_at INTEGER,
        PRIMARY KEY (token_symbol, chain)
      );
      CREATE INDEX IF NOT EXISTS idx_trades_wallet ON wallet_trades(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_trades_token ON wallet_trades(token_symbol, chain);
      CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON wallet_trades(block_timestamp);
    `);
    db = d;
    return d;
  })();
  return dbInit;
}

export function closeDb(): void {
  if (db) { db.close(); db = null; dbInit = null; }
}

export async function seedWallets(wallets: Array<{ address: string; chain: Chain; label: string; pnl30d: number; source: string }>): Promise<number> {
  const d = await getDb();
  const insert = d.prepare('INSERT OR REPLACE INTO smart_wallets (address, chain, label, pnl_30d, source, first_seen, last_active) VALUES (?, ?, ?, ?, ?, ?, ?)');
  let count = 0;
  const now = Math.floor(Date.now() / 1000);
  for (const w of wallets) {
    insert.run(w.address, w.chain, w.label, w.pnl30d, w.source, now, now);
    count++;
  }
  return count;
}

export async function getTrackedWallets(chain?: Chain): Promise<Array<{ address: string; chain: Chain; label: string; pnl_30d: number }>> {
  const d = await getDb();
  if (chain) {
    return d.prepare('SELECT address, chain, label, pnl_30d FROM smart_wallets WHERE chain = ?').all(chain) as any[];
  }
  return d.prepare('SELECT address, chain, label, pnl_30d FROM smart_wallets').all() as any[];
}

export async function recordTrade(trade: { wallet: string; tokenAddress: string; tokenSymbol: string; chain: Chain; side: 'buy' | 'sell'; valueUsd: number; txHash: string; timestamp: number }): Promise<void> {
  const d = await getDb();
  d.prepare(
    'INSERT INTO wallet_trades (wallet_address, token_address, token_symbol, chain, side, value_usd, tx_hash, block_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(trade.wallet, trade.tokenAddress, trade.tokenSymbol, trade.chain, trade.side, trade.valueUsd, trade.txHash, trade.timestamp);
}

export async function computeNetflow(chain: Chain): Promise<any[]> {
  const d = await getDb();
  const nowS = Math.floor(Date.now() / 1000);
  const h1 = nowS - 3600;
  const h24 = nowS - 86400;
  const d7 = nowS - 604800;
  const d30 = nowS - 2592000;

  const rows = d.prepare(`
    SELECT
      token_symbol,
      chain,
      SUM(CASE WHEN side = 'buy' THEN value_usd ELSE -value_usd END) as netflow,
      SUM(CASE WHEN block_timestamp >= ? AND side = 'buy' THEN value_usd ELSE 0 END) as buy_1h,
      SUM(CASE WHEN block_timestamp >= ? AND side = 'buy' THEN value_usd ELSE 0 END) as buy_24h,
      SUM(CASE WHEN block_timestamp >= ? AND side = 'sell' THEN value_usd ELSE 0 END) as sell_24h,
      COUNT(DISTINCT wallet_address) as trader_count,
      SUM(value_usd) as total_volume
    FROM wallet_trades
    WHERE chain = ?
    GROUP BY token_symbol, chain
    HAVING ABS(netflow) > 0
    ORDER BY ABS(netflow) DESC
  `).all(h1, h24, h24, chain) as any[];

  const deleteStmt = d.prepare('DELETE FROM token_netflow WHERE chain = ?');
  const upsertStmt = d.prepare(`
    INSERT INTO token_netflow (token_symbol, chain, netflow_1h, netflow_24h, netflow_7d, netflow_30d, trader_count, buy_volume, sell_volume, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(token_symbol, chain) DO UPDATE SET
      netflow_1h=excluded.netflow_1h, netflow_24h=excluded.netflow_24h,
      netflow_7d=excluded.netflow_7d, netflow_30d=excluded.netflow_30d,
      trader_count=excluded.trader_count, buy_volume=excluded.buy_volume,
      sell_volume=excluded.sell_volume, updated_at=excluded.updated_at
  `);

  deleteStmt.run(chain);
  const now = Math.floor(Date.now() / 1000);
  for (const r of rows) {
    upsertStmt.run(r.token_symbol, r.chain, r.buy_1h - (r.total_volume - r.buy_1h), r.netflow, r.netflow, r.netflow, r.trader_count, r.buy_24h, r.sell_24h, now);
  }

  return rows.map(r => ({
    symbol: r.token_symbol,
    token_symbol: r.token_symbol,
    address: r.token_symbol,
    netFlow1h: r.buy_1h - (r.total_volume - r.buy_1h),
    net_flow_24h_usd: r.netflow,
    netFlow24h: r.netflow,
    net_flow_7d_usd: r.netflow,
    netFlow7d: r.netflow,
    net_flow_30d_usd: r.netflow,
    netFlow30d: r.netflow,
    trader_count: r.trader_count,
    traderCount: r.trader_count,
    smart_money_count: r.trader_count,
    chain: r.chain,
    marketCap: 0,
  }));
}

export async function fetchNetflow(chain: Chain, limit: number): Promise<ProviderResult> {
  const t0 = Date.now();
  const cacheKey = `sm:netflow:${chain}:${limit}`;
  const c = cache.get(cacheKey);
  if (c !== undefined) {
    record({ endpoint: 'smart-money:netflow', method: 'EXEC', latencyMs: 0, status: 'CACHED', cacheStatus: 'HIT', role: 'Smart Money Netflow', chain });
    return { ok: true, data: { data: c } };
  }
  const data = (await computeNetflow(chain)).slice(0, limit);
  cache.put(cacheKey, data);
  record({ endpoint: 'smart-money:netflow', method: 'EXEC', latencyMs: Date.now() - t0, status: '200', cacheStatus: 'MISS', role: 'Smart Money Netflow', chain });
  return { ok: true, data: { data } };
}

export async function fetchSmDexTrades(chain: Chain, limit: number): Promise<ProviderResult> {
  const t0 = Date.now();
  const d = await getDb();
  const trades = d.prepare(`
    SELECT wallet_address, token_symbol, token_address, chain, side, value_usd, block_timestamp
    FROM wallet_trades WHERE chain = ? ORDER BY block_timestamp DESC LIMIT ?
  `).all(chain, limit) as any[];

  const mapped = trades.map(t => ({
    trader_address: t.wallet_address,
    wallet: t.wallet_address,
    trader: t.wallet_address,
    token_bought_symbol: t.side === 'buy' ? t.token_symbol : '',
    boughtSymbol: t.side === 'buy' ? t.token_symbol : '',
    symbol: t.token_symbol,
    token_bought_address: t.side === 'buy' ? t.token_address : '',
    boughtAddress: t.side === 'buy' ? t.token_address : '',
    trade_value_usd: t.value_usd,
    value_usd: t.value_usd,
    valueUsd: t.value_usd,
    chain: t.chain,
    timestamp: new Date(t.block_timestamp * 1000).toISOString(),
  }));

  record({ endpoint: 'smart-money:dex-trades', method: 'EXEC', latencyMs: Date.now() - t0, status: '200', cacheStatus: 'MISS', role: 'Smart Money DEX Trades', chain });
  return { ok: true, data: { data: mapped } };
}

export async function fetchWhoBoughtSold(chain: Chain, token: string): Promise<ProviderResult> {
  const d = await getDb();
  const nowS = Math.floor(Date.now() / 1000);
  const d30 = nowS - 2592000;
  const buyers = d.prepare(
    "SELECT COUNT(DISTINCT wallet_address) as cnt FROM wallet_trades WHERE chain = ? AND token_symbol = ? AND side = 'buy' AND block_timestamp >= ?",
  ).get(chain, token.toUpperCase(), d30) as any;
  const sellers = d.prepare(
    "SELECT COUNT(DISTINCT wallet_address) as cnt FROM wallet_trades WHERE chain = ? AND token_symbol = ? AND side = 'sell' AND block_timestamp >= ?",
  ).get(chain, token.toUpperCase(), d30) as any;
  return {
    ok: true,
    data: {
      data: {
        smart_money_buyers: buyers?.cnt || 0,
        smart_money_sellers: sellers?.cnt || 0,
      },
    },
  };
}

export async function fetchFlowIntel(chain: Chain, token: string): Promise<ProviderResult> {
  return {
    ok: true,
    data: {
      data: {
        cex_outflow_usd: 0,
        cex_inflow_usd: 0,
      },
    },
  };
}

export async function fetchTokenIndicators(chain: Chain, token: string): Promise<ProviderResult> {
  const d = await getDb();
  const wallets = d.prepare(
    "SELECT COUNT(DISTINCT wallet_address) as cnt FROM wallet_trades WHERE chain = ? AND token_symbol = ? AND side = 'buy'",
  ).get(chain, token.toUpperCase()) as any;
  const totalTrades = d.prepare(
    "SELECT COUNT(*) as cnt FROM wallet_trades WHERE chain = ? AND token_symbol = ?",
  ).get(chain, token.toUpperCase()) as any;
  const smScore = Math.min(((wallets?.cnt || 0) / Math.max(totalTrades?.cnt || 1, 1)) * 100, 10);
  return {
    ok: true,
    data: {
      data: {
        smart_money_score: smScore,
        whale_concentration: smScore * 0.8,
        flow_score: smScore * 0.6,
      },
    },
  };
}
