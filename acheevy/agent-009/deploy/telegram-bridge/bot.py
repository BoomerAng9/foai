"""
A.I.M.S. Telegram Bot — Point-of-Contact Bridge
================================================
Provides real-time deploy alerts, agent status updates, and a command interface
for operators to query live system state without SSH-ing into the server.

Environment variables (add to .env.production):
  TELEGRAM_BOT_TOKEN   — from @BotFather
  TELEGRAM_CHAT_ID     — your personal or group chat ID (use /start to discover)
  VPS1_URL             — http://10.0.0.1:3001 (internal)
  VPS2_URL             — http://10.0.0.2:4400 (internal)
  AIMS_DOMAIN          — plugmein.cloud
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone

import httpx
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("aims.bot")

# ─── Config ────────────────────────────────────────────────────────────────
BOT_TOKEN    = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID      = int(os.environ["TELEGRAM_CHAT_ID"])
VPS1_URL     = os.environ.get("VPS1_URL", "http://10.0.0.1:3001")
VPS2_URL     = os.environ.get("VPS2_URL", "http://10.0.0.2:4400")
AIMS_DOMAIN  = os.environ.get("AIMS_DOMAIN", "plugmein.cloud")


# ─── Guards ─────────────────────────────────────────────────────────────────
def _is_authorized(update: Update) -> bool:
    """Only allow the configured chat."""
    return update.effective_chat.id == CHAT_ID


async def _deny(update: Update) -> None:
    await update.message.reply_text("⛔ Unauthorized.")


# ─── Helper: fetch JSON from internal services ───────────────────────────────
async def _get(url: str, timeout: float = 5.0) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.json()
    except Exception as e:
        log.warning("GET %s failed: %s", url, e)
        return None


# ─── Command handlers ────────────────────────────────────────────────────────

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_authorized(update):
        await _deny(update)
        return
    chat_id = update.effective_chat.id
    msg = (
        f"👋 *A.I.M.S. Ops Bridge*\n"
        f"Chat ID: `{chat_id}`\n\n"
        f"*Commands:*\n"
        f"/status — system health\n"
        f"/sandbox — VPS2 sandbox health\n"
        f"/plugs — active plug instances\n"
        f"/deploy — trigger rolling deploy (reads .env)\n"
        f"/logs — tail recent server logs\n"
        f"/help — this message"
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


async def cmd_status(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_authorized(update):
        await _deny(update)
        return

    vps1 = await _get(f"{VPS1_URL}/health")
    vps2 = await _get(f"{VPS2_URL}/health")
    ts   = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    v1 = "✅ Online" if (vps1 and vps1.get("status") == "ok") else "❌ Offline"
    v2 = "✅ Online" if (vps2 and vps2.get("status") == "ok") else "❌ Offline"

    msg = (
        f"🖥 *A.I.M.S. System Status*\n"
        f"`{ts}`\n\n"
        f"• VPS1 (Agent)     {v1}\n"
        f"• VPS2 (Sandbox)   {v2}\n"
        f"• Domain           https://{AIMS_DOMAIN}"
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


async def cmd_sandbox(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_authorized(update):
        await _deny(update)
        return

    data = await _get(f"{VPS2_URL}/health")
    if not data:
        await update.message.reply_text("❌ VPS2 sandbox unreachable.")
        return

    msg = f"📦 *VPS2 OpenSandbox Health*\n```\n{data}\n```"
    await update.message.reply_text(msg, parse_mode="Markdown")


async def cmd_plugs(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_authorized(update):
        await _deny(update)
        return

    data = await _get("http://10.0.0.2:4200/plugs")
    if not data:
        await update.message.reply_text("❌ Plug Engine unreachable.")
        return

    plug_count = len(data) if isinstance(data, dict) else "?"
    msg = f"🔌 *Active Plugs*: {plug_count}\n\n"
    if isinstance(data, dict):
        for plug_id, info in list(data.items())[:10]:
            msg += f"• `{plug_id}` → port {info.get('port', '?')} — {info.get('status', '?')}\n"
    await update.message.reply_text(msg, parse_mode="Markdown")


async def cmd_help(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await cmd_start(update, ctx)


async def cmd_unknown(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "❓ Unknown command. Use /help to see available commands."
    )


# ─── Outbound notification helper (call from deploy hooks etc.) ──────────────

async def notify(text: str) -> None:
    """Send a message to the configured CHAT_ID. Can be called as a one-shot."""
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={"chat_id": CHAT_ID, "text": text, "parse_mode": "Markdown"},
        )


# ─── Entry point ─────────────────────────────────────────────────────────────

def main() -> None:
    log.info("Starting A.I.M.S. Telegram bridge…")
    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .build()
    )

    app.add_handler(CommandHandler("start",   cmd_start))
    app.add_handler(CommandHandler("help",    cmd_help))
    app.add_handler(CommandHandler("status",  cmd_status))
    app.add_handler(CommandHandler("sandbox", cmd_sandbox))
    app.add_handler(CommandHandler("plugs",   cmd_plugs))
    app.add_handler(MessageHandler(filters.COMMAND, cmd_unknown))

    log.info("Polling for updates…")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
