'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

type Browser = 'chrome' | 'edge' | 'safari' | 'firefox' | 'other';

function detectBrowser(): Browser {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'edge';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari';
  return 'other';
}

const STEPS: Record<Browser, { name: string; steps: string[]; settingsUrl?: string }> = {
  chrome: {
    name: 'Chrome',
    steps: [
      'Click the small icon left of "hawk.foai.cloud" in the address bar (the lock, info, or "tune" icon)',
      'Choose "Site settings"',
      'Find Microphone → switch to "Allow"',
      'Reload this page',
    ],
    settingsUrl: 'chrome://settings/content/siteDetails?site=https%3A%2F%2Fhawk.foai.cloud',
  },
  edge: {
    name: 'Edge',
    steps: [
      'Click the lock icon to the left of the URL',
      'Choose "Permissions for this site"',
      'Set Microphone to "Allow"',
      'Reload this page',
    ],
    settingsUrl: 'edge://settings/content/siteDetails?site=https%3A%2F%2Fhawk.foai.cloud',
  },
  safari: {
    name: 'Safari',
    steps: [
      'Open Safari → Settings → Websites → Microphone',
      'Find hawk.foai.cloud and switch it to "Allow"',
      'Or: right-click the address bar → "Settings for this Website" → Microphone → Allow',
      'Reload this page',
    ],
  },
  firefox: {
    name: 'Firefox',
    steps: [
      'Voice input is not supported in Firefox yet. Open hawk.foai.cloud in Chrome, Edge, or Safari to use voice.',
    ],
  },
  other: {
    name: 'this browser',
    steps: [
      'Find your browser\'s site-permissions panel (usually behind the lock icon)',
      'Set Microphone to Allow for hawk.foai.cloud',
      'Reload this page',
    ],
  },
};

interface Props {
  /** When true, render even if the Permissions API can't confirm a denial. */
  forceShow?: boolean;
}

export function MicPermissionHelp({ forceShow = false }: Props) {
  const [state, setState] = useState<PermissionState | 'unknown'>('unknown');
  // Auto-expand whenever the parent forces the banner (i.e. the visitor just
  // clicked mic and got NotAllowedError) — they need the steps, not a click target.
  const [open, setOpen] = useState(forceShow);
  const browser = detectBrowser();

  useEffect(() => {
    if (forceShow) setOpen(true);
  }, [forceShow]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Some browsers don't have navigator.permissions or 'microphone'.
        // Treat absence as 'unknown'.
        const p = (navigator as unknown as { permissions?: { query: (q: { name: string }) => Promise<PermissionStatus> } }).permissions;
        if (!p) return;
        const status = await p.query({ name: 'microphone' as PermissionName });
        if (cancelled) return;
        setState(status.state);
        status.onchange = () => setState(status.state);
      } catch {
        // ignore — keeps state 'unknown'
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-show only when the Permissions API confirms a hard denial,
  // or when caller forces it (e.g. after a getUserMedia NotAllowedError).
  const shouldShow = forceShow || state === 'denied';
  if (!shouldShow) return null;

  const guide = STEPS[browser];
  const isFirefox = browser === 'firefox';

  return (
    <div className="mt-3 rounded-lg border border-foai-gold/40 bg-foai-gold/5 p-3 text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-foai-gold hover:text-foai-gold/80"
      >
        <span className="flex items-center gap-2 font-medium">
          <ShieldAlert className="size-4" />
          {isFirefox
            ? 'Voice input not supported in Firefox'
            : `Microphone access blocked — open ${guide.name} site settings to fix`}
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {open && (
        <div className="mt-3 pl-6 text-foai-text/90">
          <ol className="list-decimal space-y-1.5 text-[13px] leading-relaxed">
            {guide.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {guide.settingsUrl && (
            <p className="mt-3 text-[12px] text-foai-muted">
              Tip: paste{' '}
              <code
                className="px-1.5 py-0.5 rounded bg-foai-bg text-foai-cyan font-mono text-[11px] cursor-pointer select-all"
                onClick={() => navigator.clipboard?.writeText(guide.settingsUrl!)}
                title="Click to copy"
              >
                {guide.settingsUrl}
              </code>{' '}
              into a new tab — opens the site-permission page directly.{' '}
              <ExternalLink className="inline size-3 align-text-top" />
            </p>
          )}
        </div>
      )}
    </div>
  );
}
