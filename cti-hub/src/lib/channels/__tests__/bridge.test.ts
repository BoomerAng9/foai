import { getChannelConfigs, sendToChannel } from '../bridge';

describe('channel bridge', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GMAIL_OAUTH_TOKEN;
    delete process.env.WHATSAPP_API_KEY;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('keeps stub adapters disabled even when secrets exist', () => {
    process.env.GMAIL_OAUTH_TOKEN = 'token';
    process.env.WHATSAPP_API_KEY = 'key';

    const configs = getChannelConfigs();

    expect(configs.email.enabled).toBe(false);
    expect(configs.email.implemented).toBe(false);
    expect(configs.whatsapp.enabled).toBe(false);
    expect(configs.whatsapp.implemented).toBe(false);
  });

  it('enables implemented bot adapters when tokens are present', () => {
    process.env.DISCORD_BOT_TOKEN = 'discord-token';
    process.env.TELEGRAM_BOT_TOKEN = 'telegram-token';

    const configs = getChannelConfigs();

    expect(configs.discord.enabled).toBe(true);
    expect(configs.telegram.enabled).toBe(true);
  });

  it('refuses sends for unimplemented adapters', async () => {
    process.env.GMAIL_OAUTH_TOKEN = 'token';
    process.env.WHATSAPP_API_KEY = 'key';

    await expect(sendToChannel('email', 'owner@foai.cloud', 'hello')).resolves.toBe(false);
    await expect(sendToChannel('whatsapp', '+15555550123', 'hello')).resolves.toBe(false);
  });
});
