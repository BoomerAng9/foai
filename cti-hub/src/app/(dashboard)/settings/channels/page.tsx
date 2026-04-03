'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Hash, Phone, Mail, Globe, Check, X, ExternalLink, Plus } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  platform: 'telegram' | 'whatsapp' | 'discord' | 'email' | 'web';
  icon: typeof MessageCircle;
  status: 'connected' | 'disconnected' | 'pending';
  description: string;
  configUrl?: string;
  webhookUrl?: string;
  connectedAt?: string;
}

const AVAILABLE_CHANNELS: Channel[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    platform: 'telegram',
    icon: MessageCircle,
    status: 'disconnected',
    description: 'Connect ACHEEVY to Telegram. Users message the bot, ACHEEVY responds with full capabilities.',
    configUrl: 'https://t.me/BotFather',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    platform: 'whatsapp',
    icon: Phone,
    status: 'disconnected',
    description: 'Connect via WhatsApp Business API. Requires Meta Business verification and a phone number.',
    configUrl: 'https://business.facebook.com/latest/whatsapp_manager',
  },
  {
    id: 'discord',
    name: 'Discord',
    platform: 'discord',
    icon: Hash,
    status: 'disconnected',
    description: 'Add ACHEEVY to your Discord server. Responds in designated channels or DMs.',
    configUrl: 'https://discord.com/developers/applications',
  },
  {
    id: 'email',
    name: 'Email (Inbound)',
    platform: 'email',
    icon: Mail,
    status: 'disconnected',
    description: 'Forward emails to ACHEEVY for processing. Auto-responds based on content classification.',
  },
  {
    id: 'web-widget',
    name: 'Website Widget',
    platform: 'web',
    icon: Globe,
    status: 'connected',
    description: 'Embed ACHEEVY chat on any website. Copy the snippet and paste into your HTML.',
    connectedAt: 'Always available',
  },
];

function StatusBadge({ status }: { status: Channel['status'] }) {
  const config = {
    connected: { color: 'bg-signal-success/20 text-signal-success', label: 'CONNECTED' },
    disconnected: { color: 'bg-bg-elevated text-fg-ghost', label: 'NOT CONNECTED' },
    pending: { color: 'bg-signal-warning/20 text-signal-warning', label: 'PENDING' },
  }[status];

  return (
    <span className={`px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider ${config.color}`}>
      {config.label}
    </span>
  );
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState(AVAILABLE_CHANNELS);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [webhookInput, setWebhookInput] = useState('');

  function startConfigure(channelId: string) {
    setConfiguring(channelId);
    setTokenInput('');
    setWebhookInput('');
  }

  async function saveConfig(channelId: string) {
    // Save channel configuration
    setChannels(prev => prev.map(ch =>
      ch.id === channelId ? {
        ...ch,
        status: 'pending' as const,
        connectedAt: new Date().toISOString(),
      } : ch
    ));
    setConfiguring(null);

    // In production: POST to /api/channels/connect
    // with { platform, token, webhookUrl }
    // The server validates and starts the bot/webhook

    // Simulate connection after brief delay
    setTimeout(() => {
      setChannels(prev => prev.map(ch =>
        ch.id === channelId ? { ...ch, status: 'connected' as const } : ch
      ));
    }, 2000);
  }

  function disconnect(channelId: string) {
    setChannels(prev => prev.map(ch =>
      ch.id === channelId ? { ...ch, status: 'disconnected' as const, connectedAt: undefined } : ch
    ));
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Link href="/settings" className="text-fg-tertiary hover:text-fg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <p className="label-mono mb-1">Settings</p>
            <h1 className="text-2xl font-light tracking-tight">
              Channel <span className="font-bold">Connections</span>
            </h1>
          </div>
        </div>
        <p className="text-fg-secondary text-sm">
          Connect ACHEEVY to external platforms. Users on those platforms get the same ACHEEVY experience — your full agent workforce responds wherever your audience is.
        </p>
      </div>

      {/* Channel list */}
      <div className="space-y-4">
        {channels.map(channel => (
          <div key={channel.id} className="card">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-bg-elevated border border-border flex items-center justify-center shrink-0">
                <channel.icon className="w-4 h-4 text-fg-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-sm">{channel.name}</h3>
                  <StatusBadge status={channel.status} />
                </div>
                <p className="text-xs text-fg-secondary leading-relaxed mb-3">
                  {channel.description}
                </p>

                {/* Configuration panel */}
                {configuring === channel.id && (
                  <div className="bg-bg-elevated border border-border p-4 mb-3 space-y-3">
                    {channel.platform === 'telegram' && (
                      <>
                        <div>
                          <label className="label-mono block mb-1">Bot Token</label>
                          <input
                            type="password"
                            value={tokenInput}
                            onChange={e => setTokenInput(e.target.value)}
                            placeholder="123456:ABC-DEF..."
                            className="input-field w-full text-sm"
                          />
                          <p className="text-[10px] text-fg-ghost mt-1">
                            Get this from <a href="https://t.me/BotFather" target="_blank" rel="noopener" className="text-accent underline">@BotFather</a> on Telegram
                          </p>
                        </div>
                      </>
                    )}
                    {channel.platform === 'whatsapp' && (
                      <>
                        <div>
                          <label className="label-mono block mb-1">Phone Number ID</label>
                          <input type="text" value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="1234567890" className="input-field w-full text-sm" />
                        </div>
                        <div>
                          <label className="label-mono block mb-1">Access Token</label>
                          <input type="password" value={webhookInput} onChange={e => setWebhookInput(e.target.value)} placeholder="EAAG..." className="input-field w-full text-sm" />
                        </div>
                      </>
                    )}
                    {channel.platform === 'discord' && (
                      <>
                        <div>
                          <label className="label-mono block mb-1">Bot Token</label>
                          <input type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="MTk..." className="input-field w-full text-sm" />
                        </div>
                        <div>
                          <label className="label-mono block mb-1">Server ID (optional)</label>
                          <input type="text" value={webhookInput} onChange={e => setWebhookInput(e.target.value)} placeholder="Guild ID" className="input-field w-full text-sm" />
                        </div>
                      </>
                    )}
                    {channel.platform === 'email' && (
                      <div>
                        <label className="label-mono block mb-1">Forwarding Address</label>
                        <div className="input-field w-full text-sm bg-bg-surface select-all cursor-text py-2.5">
                          acheevy-inbox@foai.cloud
                        </div>
                        <p className="text-[10px] text-fg-ghost mt-1">Forward emails to this address. ACHEEVY processes and responds.</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => saveConfig(channel.id)} disabled={!tokenInput && channel.platform !== 'email'} className="btn-solid text-xs disabled:opacity-30">
                        Connect
                      </button>
                      <button onClick={() => setConfiguring(null)} className="btn-bracket text-xs">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {channel.status === 'disconnected' && !configuring && (
                    <button onClick={() => startConfigure(channel.id)} className="btn-solid text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Connect
                    </button>
                  )}
                  {channel.status === 'connected' && channel.id !== 'web-widget' && (
                    <button onClick={() => disconnect(channel.id)} className="btn-bracket text-xs text-signal-error">
                      Disconnect
                    </button>
                  )}
                  {channel.configUrl && (
                    <a href={channel.configUrl} target="_blank" rel="noopener" className="btn-bracket text-xs inline-flex items-center gap-1">
                      Platform Settings <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                {channel.connectedAt && channel.status === 'connected' && (
                  <p className="text-[10px] text-fg-ghost mt-2 font-mono">
                    Connected: {channel.connectedAt === 'Always available' ? channel.connectedAt : new Date(channel.connectedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Webhook info */}
      <div className="card bg-bg-elevated">
        <p className="label-mono mb-2">Webhook Endpoint</p>
        <p className="text-xs text-fg-secondary mb-2">
          All connected channels route through a single webhook. ACHEEVY handles the routing.
        </p>
        <code className="text-[11px] font-mono text-accent block bg-bg-surface border border-border p-2">
          https://deploy.foai.cloud/api/channels/webhook
        </code>
      </div>
    </div>
  );
}
