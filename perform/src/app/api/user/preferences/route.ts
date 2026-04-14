import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { Sport } from '@/lib/franchise/types';

const COOKIE_NAME = 'perform-preferences';
const VALID_SPORTS: Sport[] = ['nfl', 'nba', 'mlb'];

interface SelectedTeamPreference {
  sport: Sport;
  abbr: string;
}

interface PreferencesCookie {
  selected_team?: SelectedTeamPreference;
}

function parseCookieValue(raw: string | undefined): PreferencesCookie {
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw)) as PreferencesCookie;
  } catch {
    return {};
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const preferences = parseCookieValue(cookieStore.get(COOKIE_NAME)?.value);
  return NextResponse.json({ preferences });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    key?: string;
    value?: { sport?: string; abbr?: string };
  } | null;

  if (body?.key !== 'selected_team') {
    return NextResponse.json({ error: 'Unsupported preference key.' }, { status: 400 });
  }

  const sport = body.value?.sport?.toLowerCase() as Sport | undefined;
  const abbr = body.value?.abbr?.toUpperCase();

  if (!sport || !VALID_SPORTS.includes(sport)) {
    return NextResponse.json({ error: 'Invalid sport. Use nfl, nba, or mlb.' }, { status: 400 });
  }

  if (!abbr || abbr.length > 5) {
    return NextResponse.json({ error: 'Invalid team abbreviation.' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const existing = parseCookieValue(cookieStore.get(COOKIE_NAME)?.value);
  const preferences: PreferencesCookie = {
    ...existing,
    selected_team: { sport, abbr },
  };

  const response = NextResponse.json({ ok: true, preferences });
  response.cookies.set(COOKIE_NAME, encodeURIComponent(JSON.stringify(preferences)), {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}