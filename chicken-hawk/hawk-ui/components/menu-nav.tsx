import { cookies } from 'next/headers';
import { MenuNavLinks } from './menu-nav-links';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://hawk-gateway:8000';

interface MeResponse {
  email?: string;
  ok?: boolean;
}

async function probeOwner(): Promise<{ signedIn: boolean; owner: string | null }> {
  const jar = await cookies();
  const session = jar.get('ch_session')?.value;
  if (!session) return { signedIn: false, owner: null };
  try {
    const res = await fetch(`${GATEWAY_URL}/me`, {
      headers: { Cookie: `ch_session=${session}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return { signedIn: false, owner: null };
    // /me returns HTML for browsers, but the server-rendered body always
    // contains the owner email when signed in. The presence of a 200 is
    // sufficient signal for nav state — owner email is best-effort.
    const text = await res.text();
    const match = text.match(/Signed in as[^<]*<[^>]+>([^<]+)</i)
      || text.match(/Signed in as\s+<[^>]+>([^<]+)</i)
      || text.match(/Signed in as\s+([\w.+-]+@[\w.-]+\.[a-z]{2,})/i);
    return { signedIn: true, owner: match ? match[1].trim() : null };
  } catch {
    return { signedIn: false, owner: null };
  }
}

export async function MenuNav() {
  const { signedIn, owner } = await probeOwner();
  return <MenuNavLinks signedIn={signedIn} owner={owner} />;
}
