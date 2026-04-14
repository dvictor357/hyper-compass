import TelegramBot from 'node-telegram-bot-api';

export interface AlertMessage {
  type: 'syndicate' | 'divergence' | 'convergence';
  title: string;
  body: string;
  conviction: number;
  tokens: string[];
  chains: string[];
}

const subscribers = new Set<string>();
let lastScanTime: number | null = null;
let lastSummary: string | null = null;
let bot: TelegramBot | null = null;
let scanHandler: (() => Promise<void>) | null = null;

const IS_MOCK = process.env.NANSEN_MOCK === 'true';

export function formatAlert(alert: AlertMessage): string {
  const emoji = alert.type === 'syndicate' ? '\u{1F6A8}' : alert.type === 'divergence' ? '\u{26A0}\u{FE0F}' : '\u{2705}';
  const filled = Math.round(alert.conviction / 10);
  const bar = '\u{2588}'.repeat(filled) + '\u{2591}'.repeat(10 - filled);

  return [
    `${emoji} *${esc(alert.title)}*`,
    '',
    esc(alert.body),
    '',
    `*Conviction:* ${bar} ${alert.conviction}/100`,
    `*Tokens:* ${esc(alert.tokens.join(', '))}`,
    `*Chains:* ${esc(alert.chains.join(', '))}`,
    '',
    '_Hyper Compass_',
  ].join('\n');
}

function esc(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

export async function sendAlert(chatId: string, alert: AlertMessage): Promise<void> {
  const formatted = formatAlert(alert);
  if (IS_MOCK || !bot) { console.log(`[TELEGRAM] Alert to ${chatId}:\n${formatted}\n`); return; }
  await bot.sendMessage(chatId, formatted, { parse_mode: 'MarkdownV2' });
}

export async function broadcastAlert(alert: AlertMessage): Promise<number> {
  const formatted = formatAlert(alert);
  let sent = 0;
  for (const chatId of subscribers) {
    try {
      if (IS_MOCK || !bot) { console.log(`[TELEGRAM] Broadcast to ${chatId}:\n${formatted}\n`); sent++; continue; }
      await bot.sendMessage(chatId, formatted, { parse_mode: 'MarkdownV2' });
      sent++;
    } catch { subscribers.delete(chatId); }
  }
  return sent;
}

export function onScanRequest(handler: () => Promise<void>): void {
  scanHandler = handler;
}

export function updateScanStatus(summary: string): void {
  lastScanTime = Date.now();
  lastSummary = summary;
}

export function getSubscriberCount(): number {
  return subscribers.size;
}

export function getSubscribers(): string[] {
  return Array.from(subscribers);
}

export function startBot(): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.warn('[TELEGRAM] TELEGRAM_BOT_TOKEN not set.'); return; }
  if (IS_MOCK) { console.log('[TELEGRAM] Mock mode.'); return; }

  bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start/, (msg) => {
    const chatId = String(msg.chat.id);
    bot!.sendMessage(chatId, '*Hyper Compass*\n\nCommands:\n/subscribe - Get alerts\n/status - Scan status\n/scan - Manual scan', { parse_mode: 'MarkdownV2' });
  });

  bot.onText(/\/subscribe/, (msg) => {
    const chatId = String(msg.chat.id);
    const isNew = !subscribers.has(chatId);
    subscribers.add(chatId);
    bot!.sendMessage(chatId, isNew ? '\u{2705} Subscribed\\!' : 'Already subscribed\\.', { parse_mode: 'MarkdownV2' });
  });

  bot.onText(/\/status/, (msg) => {
    const chatId = String(msg.chat.id);
    const age = lastScanTime ? `${Math.round((Date.now() - lastScanTime) / 60_000)}min ago` : 'Never';
    bot!.sendMessage(chatId, `*Status*\nLast scan: ${esc(age)}\nSubscribers: ${subscribers.size}\n${lastSummary ? `Last signal: ${esc(lastSummary)}` : 'No signals yet'}`, { parse_mode: 'MarkdownV2' });
  });

  bot.onText(/\/scan/, async (msg) => {
    const chatId = String(msg.chat.id);
    if (!scanHandler) { bot!.sendMessage(chatId, 'No scan handler\\.', { parse_mode: 'MarkdownV2' }); return; }
    bot!.sendMessage(chatId, 'Scanning\\.\\.\\.', { parse_mode: 'MarkdownV2' });
    try { await scanHandler(); bot!.sendMessage(chatId, '\u{2705} Done\\.', { parse_mode: 'MarkdownV2' }); }
    catch (err) { bot!.sendMessage(chatId, `\u{274C} Failed: ${esc(err instanceof Error ? err.message : 'Unknown')}`, { parse_mode: 'MarkdownV2' }); }
  });

  console.log('[TELEGRAM] Bot started.');
}

export function stopBot(): void {
  if (bot) { bot.stopPolling(); bot = null; }
}
