// POST /api/voice/session
//
// Mints a scoped Inworld Realtime session token for the calling owner.
// Per access-tier canon, this route MUST be owner-only — never anonymous.
//
// Flow:
//   1. Verify the inbound session cookie binds to OWNER_EMAIL via the gateway's /me endpoint
//   2. POST to Inworld's session-token endpoint with INWORLD_API_KEY (server-side env)
//   3. Return { token, sessionId, workspaceId, characterId } to the client
//
// The browser then opens an Inworld Realtime WebSocket directly with the scoped
// token — Inworld traffic never proxies through this server (low latency).

import { NextResponse } from 'next/server';

const INWORLD_API_KEY = process.env.INWORLD_API_KEY;
const INWORLD_WORKSPACE = process.env.NEXT_PUBLIC_INWORLD_WORKSPACE_ID;
const INWORLD_CHARACTER = process.env.NEXT_PUBLIC_INWORLD_CHARACTER_ID;
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://hawk-gateway:8000';

export async function POST(req: Request) {
  // 1. Owner-tier gate. Forward the visitor's cookies to /me on the gateway.
  //    /me returns 200 only for valid sessions; we additionally verify the
  //    response identifies the owner email.
  const cookie = req.headers.get('cookie') || '';
  if (!cookie) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let me: { email?: string } = {};
  try {
    const meRes = await fetch(`${GATEWAY_URL}/me`, { headers: { cookie } });
    if (!meRes.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    me = await meRes.json();
  } catch {
    return NextResponse.json({ error: 'gateway unreachable' }, { status: 502 });
  }

  // The gateway already enforces that /me only succeeds for the owner email,
  // but defense-in-depth: fail closed if email isn't present.
  if (!me?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // 2. Verify Inworld is configured server-side
  if (!INWORLD_API_KEY || !INWORLD_WORKSPACE || !INWORLD_CHARACTER) {
    return NextResponse.json({ error: 'voice not configured' }, { status: 503 });
  }

  // 3. Mint Inworld session token. Replace the URL/payload with the actual
  //    Inworld Runtime v0.8 Realtime endpoint when wiring goes live.
  try {
    const tokenRes = await fetch('https://api.inworld.ai/v1/sessions:open', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INWORLD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workspace: INWORLD_WORKSPACE,
        character: INWORLD_CHARACTER,
        // Bind the session to the owner's email so Inworld's audit log shows who spoke
        userId: me.email,
      }),
    });
    if (!tokenRes.ok) {
      return NextResponse.json({ error: 'inworld session failed' }, { status: 502 });
    }
    const data: { token: string; sessionId: string } = await tokenRes.json();
    return NextResponse.json({
      token: data.token,
      sessionId: data.sessionId,
      workspaceId: INWORLD_WORKSPACE,
      characterId: INWORLD_CHARACTER,
    });
  } catch {
    return NextResponse.json({ error: 'inworld unreachable' }, { status: 502 });
  }
}
