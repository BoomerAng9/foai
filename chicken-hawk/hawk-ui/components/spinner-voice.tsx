'use client';

// Spinner voice — Inworld Realtime wrapper integration for Chicken Hawk.
//
// Architecture (per `project_spinner_inworld_boomerang_loader.md`):
//   browser  ──[WebSocket]──▶  Inworld Realtime  ──[function calls]──▶  hawk.foai.cloud/run
//                                       │
//                                       └──[TTS]──▶  browser audio
//
// The browser talks DIRECTLY to Inworld (low latency, no proxy hop). Function
// calls from Inworld go to /run via the gateway's existing NemoClaw policy gate
// — Spinner cannot bypass policy.
//
// Mic-button gating per access-tier canon (`feedback_ch_access_tier_canon.md`):
//   - Anonymous public: voice DISABLED (persona-only text chat)
//   - Owner-authenticated: voice ENABLED with full function-call surface
//
// Activation requirements (3 env vars in /docker/chicken-hawk/.env):
//   NEXT_PUBLIC_INWORLD_WORKSPACE_ID
//   NEXT_PUBLIC_INWORLD_CHARACTER_ID
//   INWORLD_API_KEY  (server-side only — minted into scoped session tokens via /api/voice/session)

import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  ownerSession?: boolean;   // true if the cookie binds to OWNER_EMAIL
  onError?: (msg: string) => void;
}

export function SpinnerVoice({ ownerSession = false, onError }: Props) {
  const [active, setActive] = useState(false);
  const [available] = useState<boolean>(
    typeof process !== 'undefined' && !!process.env.NEXT_PUBLIC_INWORLD_WORKSPACE_ID,
  );

  // Voice is owner-only by canon. Public visitors don't see the mic.
  if (!ownerSession) return null;

  if (!available) {
    return (
      <button
        type="button"
        disabled
        title="Voice setup pending — Inworld credentials not configured"
        className="flex items-center justify-center size-8 rounded-full bg-white/5 text-foai-muted opacity-40 cursor-not-allowed"
      >
        <MicOff className="size-4" />
      </button>
    );
  }

  async function toggle() {
    if (active) {
      setActive(false);
      // TODO: close Inworld session, stop mic
      return;
    }
    try {
      // Mint a scoped Inworld session token from the server.
      const res = await fetch('/api/voice/session', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`session ${res.status}`);
      // const { token, sessionId } = await res.json();
      // TODO: open Inworld Realtime WebSocket with token + workspace + character ids,
      //       wire mic capture, route function calls to /run.
      setActive(true);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={active ? 'Stop voice' : 'Start voice'}
      className={cn(
        'flex items-center justify-center size-8 rounded-full transition-all duration-200 active:scale-95',
        active
          ? 'bg-foai-gold text-foai-bg shadow-[0_0_18px_rgba(255,107,53,0.55)] animate-pulse-jet'
          : 'bg-white/[0.08] hover:bg-white/[0.12] text-foai-muted hover:text-foai-text',
      )}
    >
      {active ? <Mic className="size-4" /> : <MicOff className="size-4" />}
    </button>
  );
}
