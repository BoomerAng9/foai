'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import { usePodcasterAuth } from '@/hooks/usePodcasterAuth';

const T = {
  bg: '#06122A',
  surface: '#0B1E3F',
  border: '#1E3A5F',
  text: '#F4F6FA',
  textMuted: '#8B94A8',
  gold: '#D4A853',
  red: '#D40028',
  green: '#22C55E',
};

const INTERVALS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'per_episode', label: 'Per Episode' },
];

const FORMATS = [
  { value: 'study', label: 'Study (Private Prep)' },
  { value: 'commercial', label: 'Commercial (Shareable)' },
  { value: 'both', label: 'Both' },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
];

interface Settings {
  delivery_interval: string;
  delivery_time: string;
  delivery_timezone: string;
  email_delivery: boolean;
  delivery_email: string;
  delivery_format: string;
  notification_channels: string[];
}

export default function DeliverySettingsPage() {
  const { loading, authenticated, profile, promptLogin } = usePodcasterAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    delivery_interval: 'daily',
    delivery_time: '05:00',
    delivery_timezone: 'America/New_York',
    email_delivery: true,
    delivery_email: '',
    delivery_format: 'both',
    notification_channels: ['email', 'dashboard'],
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (!profile || settingsLoaded) return;
    const u = profile as unknown as Record<string, unknown>;
    setSettings({
      delivery_interval: (u.delivery_interval as string) || 'daily',
      delivery_time: (u.delivery_time as string) || '05:00',
      delivery_timezone: (u.delivery_timezone as string) || 'America/New_York',
      email_delivery: (u.email_delivery as boolean) ?? true,
      delivery_email: (u.delivery_email as string) || (u.email as string) || '',
      delivery_format: (u.delivery_format as string) || 'both',
      notification_channels: (u.notification_channels as string[]) || ['email', 'dashboard'],
    });
    setSettingsLoaded(true);
  }, [profile, settingsLoaded]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    await fetch('/api/podcasters/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: T.border, borderTopColor: T.gold }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ borderBottom: `2px solid ${T.red}` }}>
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <div className="flex items-center gap-3">
            <BackHomeNav />
            <span className="opacity-50">|</span>
            <span>Delivery Settings</span>
          </div>
          <Link href="/podcasters/dashboard" className="opacity-80 hover:opacity-100 transition" style={{ color: T.gold }}>
            Dashboard
          </Link>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {!authenticated && !loading && (
          <div className="text-center py-8 rounded-lg"
            style={{ background: T.surface, border: `1px solid ${T.gold}` }}>
            <p style={{ color: T.gold }} className="font-bold mb-2">Sign in to configure your deliveries</p>
            <button onClick={promptLogin} className="underline text-sm" style={{ color: T.text }}>Sign In</button>
          </div>
        )}
        <h1 className="text-2xl font-black" style={{ color: T.gold }}>Delivery Settings</h1>
        <p className="text-sm" style={{ color: T.textMuted }}>
          Configure when and how your Producer delivers briefings.
        </p>

        {/* Schedule */}
        <section className="rounded-xl p-6 space-y-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: T.gold }}>Schedule</h2>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.textMuted }}>Delivery Interval</label>
            <div className="flex gap-2">
              {INTERVALS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update('delivery_interval', opt.value)}
                  className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: settings.delivery_interval === opt.value ? T.gold : 'transparent',
                    color: settings.delivery_interval === opt.value ? T.bg : T.textMuted,
                    border: `1px solid ${settings.delivery_interval === opt.value ? T.gold : T.border}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.textMuted }}>Delivery Time</label>
              <input
                type="time"
                value={settings.delivery_time}
                onChange={(e) => update('delivery_time', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm bg-transparent outline-none"
                style={{ border: `1px solid ${T.border}`, color: T.text }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.textMuted }}>Timezone</label>
              <select
                value={settings.delivery_timezone}
                onChange={(e) => update('delivery_timezone', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace('America/', '').replace('Pacific/', '').replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Format */}
        <section className="rounded-xl p-6 space-y-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: T.gold }}>Document Format</h2>
          <div className="flex gap-2">
            {FORMATS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => update('delivery_format', opt.value)}
                className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: settings.delivery_format === opt.value ? T.gold : 'transparent',
                  color: settings.delivery_format === opt.value ? T.bg : T.textMuted,
                  border: `1px solid ${settings.delivery_format === opt.value ? T.gold : T.border}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Email */}
        <section className="rounded-xl p-6 space-y-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: T.gold }}>Email Delivery</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => update('email_delivery', !settings.email_delivery)}
              className="w-12 h-6 rounded-full relative transition-colors"
              style={{ background: settings.email_delivery ? T.green : T.border }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: settings.email_delivery ? 'translateX(26px)' : 'translateX(2px)' }}
              />
            </button>
            <span className="text-sm" style={{ color: settings.email_delivery ? T.text : T.textMuted }}>
              {settings.email_delivery ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {settings.email_delivery && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.textMuted }}>Email Address</label>
              <input
                type="email"
                value={settings.delivery_email}
                onChange={(e) => update('delivery_email', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm bg-transparent outline-none"
                style={{ border: `1px solid ${T.border}`, color: T.text }}
              />
            </div>
          )}
        </section>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            onClick={authenticated ? save : promptLogin}
            disabled={authenticated ? saving : false}
            className="px-8 py-3 rounded-lg text-sm font-bold transition-all"
            style={{
              background: T.gold,
              color: T.bg,
              opacity: (authenticated && saving) ? 0.5 : 1,
            }}
          >
            {!authenticated ? 'Sign In to Save' : saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && (
            <span className="text-sm font-bold" style={{ color: T.green }}>
              Settings saved
            </span>
          )}
        </div>
      </main>

      <footer
        className="py-6 text-center text-[10px] font-mono tracking-[0.25em] mt-8"
        style={{ background: T.bg, color: 'rgba(255,255,255,0.3)', borderTop: `1px solid ${T.border}` }}
      >
        PER|FORM FOR PODCASTERS · SETTINGS · PUBLISHED BY ACHIEVEMOR
      </footer>
    </div>
  );
}
