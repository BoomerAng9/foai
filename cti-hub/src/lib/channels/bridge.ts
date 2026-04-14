/**
 * Channel Bridge — unified messaging across Email, Discord, Telegram, WhatsApp.
 *
 * All channels converge to the same conversation thread.
 * User starts on Discord, continues on WhatsApp, reviews in the app.
 * ACHEEVY doesn't lose context.
 *
 * Each channel adapter:
 *   1. Receives message from external platform
 *   2. Maps to user_id via linked account
 *   3. Calls acheevyRespond() with the user's conversation
 *   4. Sends response back through the same channel
 */

export type Channel = 'app' | 'email' | 'discord' | 'telegram' | 'whatsapp';

export interface ChannelMessage {
  channel: Channel;
  external_id: string;     // Discord user ID, phone number, email
  user_id?: string;        // Firebase UID (resolved via linked accounts)
  content: string;
  attachments?: Array<{ type: string; url: string }>;
  timestamp: string;
}

export interface ChannelConfig {
  channel: Channel;
  enabled: boolean;
  implemented?: boolean;
  webhook_url?: string;
  bot_token?: string;
  api_key?: string;
}

const IMPLEMENTED_CHANNELS: Record<Channel, boolean> = {
  app: true,
  discord: true,
  telegram: true,
  email: false,
  whatsapp: false,
};

// Channel configs loaded from env
export function getChannelConfigs(): Record<Channel, ChannelConfig> {
  return {
    app: { channel: 'app', enabled: true },
    email: {
      channel: 'email',
      enabled: IMPLEMENTED_CHANNELS.email && !!process.env.GMAIL_OAUTH_TOKEN,
      implemented: IMPLEMENTED_CHANNELS.email,
    },
    discord: {
      channel: 'discord',
      enabled: !!process.env.DISCORD_BOT_TOKEN,
      implemented: IMPLEMENTED_CHANNELS.discord,
      bot_token: process.env.DISCORD_BOT_TOKEN,
    },
    telegram: {
      channel: 'telegram',
      enabled: !!process.env.TELEGRAM_BOT_TOKEN,
      implemented: IMPLEMENTED_CHANNELS.telegram,
      bot_token: process.env.TELEGRAM_BOT_TOKEN,
    },
    whatsapp: {
      channel: 'whatsapp',
      enabled: IMPLEMENTED_CHANNELS.whatsapp && !!process.env.WHATSAPP_API_KEY,
      implemented: IMPLEMENTED_CHANNELS.whatsapp,
      api_key: process.env.WHATSAPP_API_KEY,
    },
  };
}

// Resolve external platform ID to Firebase UID
// In production, this looks up a linked_accounts table
export async function resolveUserId(channel: Channel, externalId: string): Promise<string | null> {
  // TODO: Query linked_accounts table in Neon
  // For now, return null (user must link their account in the app first)
  void channel;
  void externalId;
  return null;
}

// Send response back through the originating channel
export async function sendToChannel(
  channel: Channel,
  externalId: string,
  message: string,
  _attachments?: Array<{ type: string; url: string }>,
): Promise<boolean> {
  const configs = getChannelConfigs();
  const config = configs[channel];
  void _attachments;

  if (!config.enabled) return false;

  switch (channel) {
    case 'discord':
      return sendDiscord(config.bot_token!, externalId, message);
    case 'telegram':
      return sendTelegram(config.bot_token!, externalId, message);
    case 'email':
      return sendEmail(externalId, message);
    case 'whatsapp':
      return sendWhatsApp(config.api_key!, externalId, message);
    default:
      return false;
  }
}

async function sendDiscord(token: string, channelId: string, message: string): Promise<boolean> {
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message.slice(0, 2000) }),
    });
    return res.ok;
  } catch { return false; }
}

async function sendTelegram(token: string, chatId: string, message: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message.slice(0, 4096), parse_mode: 'Markdown' }),
    });
    return res.ok;
  } catch { return false; }
}

async function sendEmail(to: string, message: string): Promise<boolean> {
  console.warn(`[channels] Email adapter not implemented. Refusing stub send to ${to}.`);
  void message;
  return false;
}

async function sendWhatsApp(apiKey: string, phone: string, message: string): Promise<boolean> {
  console.warn(`[channels] WhatsApp adapter not implemented. Refusing stub send to ${phone}.`);
  void apiKey;
  void message;
  return false;
}
