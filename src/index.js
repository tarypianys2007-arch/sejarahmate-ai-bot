/**
 * SejarahMate AI – Telegram Bot Entry Point
 *
 * Rule-based: No LLM. All responses driven by exact keyword/button matching.
 * Uses node-telegram-bot-api in polling mode.
 */

import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { handleInput } from "./handler.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
  console.error("❌  TELEGRAM_BOT_TOKEN is not set. Copy .env.example → .env and add your token.");
  process.exit(1);
}

// Create bot WITHOUT auto-starting polling.
// We verify the token first, then start polling manually.
// This prevents a silent race between getMe() and the polling initialiser.
const bot = new TelegramBot(TOKEN, {
  polling: {
    autoStart: false,
    interval: 300,
    params: { timeout: 10 },
  },
});

// ── Startup connectivity check ────────────────────────────────────────────────
// Calls getMe() BEFORE polling starts so any auth or network error surfaces
// with a clear message. Token is never printed.
try {
  const me = await bot.getMe();
  console.log(`🇲🇾  SejarahMate AI is running as @${me.username} (id: ${me.id})`);
  console.log(`    Link: https://t.me/${me.username}`);
} catch (err) {
  console.error("❌  Failed to connect to Telegram at startup.");
  console.error("    Check your internet connection and TELEGRAM_BOT_TOKEN.");
  console.error(`    Details: ${err.message}`);
  process.exit(1);
}

// Token verified — now safe to start polling.
bot.startPolling();

// ── Handle plain text messages ────────────────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ?? "";

  // Ignore non-text messages (stickers, photos, etc.)
  if (!text) return;

  try {
    await handleInput(bot, chatId, text, false);
  } catch (err) {
    console.error(`[ERROR] chatId=${chatId}`, err);
    await bot.sendMessage(
      chatId,
      "⚠️ Terdapat ralat teknikal. Sila cuba semula dengan taip \"Hi\"."
    ).catch(() => {});
  }
});

// ── Handle inline button callbacks ───────────────────────────────────────────
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data ?? "";

  // Always answer the callback to remove the "loading" spinner on the button
  await bot.answerCallbackQuery(query.id).catch(() => {});

  try {
    await handleInput(bot, chatId, data, true);
  } catch (err) {
    console.error(`[ERROR] callback chatId=${chatId}`, err);
    await bot.sendMessage(
      chatId,
      "⚠️ Terdapat ralat teknikal. Sila cuba semula dengan taip \"Hi\"."
    ).catch(() => {});
  }
});

// ── Polling error handler ─────────────────────────────────────────────────────
bot.on("polling_error", (err) => {
  const code = err.code ?? "UNKNOWN";
  const msg  = err.message ?? String(err);

  // 409 Conflict = another bot instance is already polling with this token.
  // Continuing would cause both instances to fight over updates — exit cleanly.
  if (code === "ETELEGRAM" && msg.includes("409")) {
    console.error("❌  [polling_error] 409 Conflict: another instance of this bot is already");
    console.error("    running with the same token. Stop the duplicate process and restart.");
    bot.stopPolling();
    process.exit(1);
  }

  // ECONNRESET / EFATAL are transient TCP drops (Telegram closes idle long-poll
  // connections every ~60 s, or the network briefly dropped). The library
  // automatically reopens the connection — no action needed.
  console.error(`[polling_error] code=${code} — ${msg}`);
});


// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on("SIGINT", () => {
  console.log("\n👋  SejarahMate AI shutting down...");
  bot.stopPolling();
  process.exit(0);
});
