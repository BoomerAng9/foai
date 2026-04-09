# HANDOFF: Authentication Login Loop — CRITICAL FIX NEEDED

**Date:** March 31, 2026
**Priority:** P0 — Platform is unusable until this is fixed
**Project:** CTI Hub (cti.foai.cloud)
**Repo:** github.com/BoomerAng9/foai, branch `feat/cti-hub-production-deploy`
**Local path:** C:\Users\rishj\foai\cti-hub
**VPS:** /opt/foai-cti on myclaw-vps (31.97.133.29)

---

## THE PROBLEM

Users (including the owner) cannot log in to cti.foai.cloud. After clicking "Sign in with Google," the Google OAuth popup completes successfully but the user is redirected back to the login page instead of reaching `/chat`. This happens in both normal and Incognito mode, ruling out browser extensions.

Both owner emails have been tested: `bpo@achievemor.io` and `jarrett.risher@gmail.com`.

At one point during testing, the OAuth flow redirected to a third-party lead generation site instead of back to the app — this was caused by misconfigured OAuth redirect URIs in GCP, which have since been corrected.

---

## WHAT HAS BEEN VERIFIED (NOT THE PROBLEM)

All infrastructure checks pass:

- Firebase Authorized Domains: `cti.foai.cloud` is listed ✅
- Firebase Auth providers: Google, Phone, Anonymous all enabled ✅
- Service Account: `firebase-adminsdk-fbsvc@foai-aims.iam.gserviceaccount.com` — correct project ✅
- Project ID match: client (`foai-aims`) and server (`foai-aims`) match ✅
- Clock sync: VPS and container both in sync ✅
- Session cookie: `/api/auth/session` POST correctly returns `Set-Cookie: firebase-auth-token=...; Secure; HttpOnly; SameSite=lax` ✅
- Health check: `/api/healthz` returns all green ✅
- Verify endpoint: `GET /api/access-keys/verify?email=bpo@achievemor.io` returns `{"allowed":true,"role":"owner"}` ✅

---

## THE AUTH FLOW (How it's supposed to work)

### Client-side (browser):

1. `src/app/auth/login/page.tsx` — User clicks "Sign in with Google"
2. Calls `authService.signInWithOAuth('google')` from `src/lib/auth-paywall.ts`
3. This calls `signInWithPopup(auth, GoogleAuthProvider)` from Firebase client SDK
4. On success, Firebase's `onAuthStateChanged` fires in `src/context/auth-provider.tsx`

### Auth provider flow (`src/context/auth-provider.tsx`, line ~140):

5. `onAuthStateChanged` callback receives `firebaseUser`
6. Calls `GET /api/access-keys/verify?email=...` — checks allowlist
7. If allowed: calls `provisionFirebaseUser(firebaseUser)`:
   - `POST /api/auth/session` with `{ accessToken: idToken }` — sets httpOnly cookie
   - `POST /api/auth/provision` with `{ firebaseUid, displayName, email }` — provisions in DB
8. `setUser(firebaseUser)` — updates React state
9. Calls `hydrateProfile(firebaseUser)` — loads profile, orgs, tier limits

### Login page redirect (`src/app/auth/login/page.tsx`, line ~17):

10. `useEffect` watches `user` state
11. When `user` is set and `!authLoading` and `!denied`: `window.location.replace('/chat')`

### What's failing:

The user never reaches step 11, OR step 11 fires but `/chat` somehow sends them back to `/auth/login`. The exact failure point is unknown because we cannot see the browser console output.

---

## WHAT HAS BEEN TRIED (ALL FAILED)

1. Changed redirect from `/` to `/chat` — still loops
2. Tried `router.push` vs `window.location.href` vs `window.location.replace` — all loop
3. Removed auth redirect from chat page that sent unauthenticated users to login — still loops
4. Made provision endpoint non-fatal on cookie verification failure — still loops
5. Set `setUser(firebaseUser)` BEFORE session cookie/provision (to unblock UI) — still loops
6. Added console.log debugging to auth provider — user reports same behavior
7. Reverted session endpoint to NOT verify tokens before setting cookie (was the hardening change) — still loops
8. Rebuilt Docker image with `--no-cache` 10+ times — still loops
9. Tested in Incognito mode — still loops
10. Cleared cookies — still loops
11. Fixed GCP OAuth redirect URIs — still loops

---

## LIKELY ROOT CAUSES TO INVESTIGATE

### 1. signInWithPopup silently failing → redirect fallback
If `signInWithPopup` throws (popup blocked, CORS, etc.), the code falls back to `signInWithRedirect`. This causes a full page reload. After reload, `getRedirectResult(auth)` is called on line 138 but its result is `.catch(() => {})` — swallowed. If `getRedirectResult` fails or returns null, the user appears unauthenticated.

**To test:** Add logging around `signInWithPopup` and `getRedirectResult`. Check if the popup actually opens or if redirect is being used.

### 2. onAuthStateChanged never fires with a user
If Firebase client SDK auth state is not persisting (e.g., `auth.setPersistence` issue, cookie/storage blocked), `onAuthStateChanged` might fire with `null` after the redirect, even though auth succeeded.

**To test:** In the auth provider's `onAuthStateChanged` callback, log `firebaseUser?.email` at the very top before any API calls.

### 3. The verify/provision chain throws and catch block resets state
Lines 166-167 in auth-provider.tsx catch errors from `provisionFirebaseUser` but `setUser` was already called. However, `hydrateProfile` at line 173 might throw. The outer catch on line 179 catches it, and `setLoading(false)` runs in finally. But if any of the hydration API calls (`/api/auth/profile`, `/api/auth/organization`, `/api/paywall/tier-limits`) return errors that cause `hydrateProfile` to throw, the user IS set but profile is null.

**To test:** Check if user is set but profile/orgs fail. The login page only checks `user` and `denied`, so this alone shouldn't cause the loop.

### 4. The login page useEffect is not firing
`window.location.replace('/chat')` might not execute if `authLoading` is never set to `false`, or if `denied` is `true`.

**To test:** Add `console.log('[Login] State:', { user: !!user, authLoading, denied })` in the useEffect.

### 5. NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN mismatch
Currently set to `foai-aims.firebaseapp.com`. The popup opens on this domain. After auth, it sends the result back to the opener window. If there's a cross-origin issue between `foai-aims.firebaseapp.com` (popup) and `cti.foai.cloud` (opener), the message might not arrive.

**To test:** Try changing `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` to `cti.foai.cloud` in `.env.local` AND `.env.production` on the VPS, then rebuild. This requires Firebase Hosting to be set up on `cti.foai.cloud` to serve `/__/auth/handler`, which it probably isn't. Alternative: use `signInWithRedirect` instead of `signInWithPopup` as the primary method.

---

## KEY FILES TO READ

| File | What it does |
|------|-------------|
| `src/app/auth/login/page.tsx` | Login page — Google sign-in button, redirect on success |
| `src/context/auth-provider.tsx` | Auth state management — THE auth loop. Lines 140-185 are critical. |
| `src/lib/auth-paywall.ts` | `signInWithOAuth()` (line ~184), `provisionFirebaseUser()` (line ~54) |
| `src/app/api/auth/session/route.ts` | Session cookie setter — accepts token, sets httpOnly cookie |
| `src/app/api/auth/provision/route.ts` | User provisioning — creates profile in Neon DB |
| `src/app/api/access-keys/verify/route.ts` | Allowlist check — returns `{allowed, role}` |
| `src/lib/firebase.ts` | Client SDK init — reads NEXT_PUBLIC_FIREBASE_* env vars |
| `src/lib/firebase-admin.ts` | Admin SDK init — loads service account from `/app/firebase-sa-key.json` |
| `src/lib/allowlist.ts` | Owner email list: `bpo@achievemor.io`, `jarrett.risher@gmail.com` |

## ENV VARS ON VPS (.env.local)

```
NEXT_PUBLIC_FIREBASE_API_KEY=<REDACTED — pull from openclaw-sop5-openclaw-1>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=foai-aims.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=foai-aims
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=foai-aims.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<REDACTED — pull from openclaw-sop5-openclaw-1>
NEXT_PUBLIC_FIREBASE_APP_ID=<REDACTED — pull from openclaw-sop5-openclaw-1>
```

> **⚠️ Security note:** Prior revisions of this file committed the literal
> Firebase API key, messaging sender ID, and app ID. Firebase web API keys
> are public by design (shipped to browsers via `NEXT_PUBLIC_*`) but should
> still be:
> 1. Restricted to specific HTTP referrers in the Firebase console
>    (foai.cloud, cti.foai.cloud, deploy.foai.cloud, localhost for dev)
> 2. Rotated if previously committed in plaintext — the previous value
>    sat in git history as of this file's prior revision
> 3. Pulled from the openclaw-sop5-openclaw-1 container env via the
>    docker-exec pattern in `reference_secrets_openclaw`, not pasted
>    into any committed file
> The messaging sender ID and app ID are identifying but not authorizing —
> still worth keeping out of docs for minimum infrastructure disclosure.

Firebase SA key mounted at `/app/firebase-sa-key.json` via Docker Compose volume.

## DOCKER

```yaml
# docker-compose.yml
services:
  cti:
    build: .
    restart: unless-stopped
    env_file:
      - .env.local
    volumes:
      - ./firebase-sa-key.json:/app/firebase-sa-key.json:ro
```

Traefik handles SSL termination. Container runs on port 3000 with `HOSTNAME=0.0.0.0`.

---

## SUGGESTED APPROACH

1. Add comprehensive console.log debugging to `auth-provider.tsx` — log every step of the `onAuthStateChanged` flow
2. Have the user open browser console and report what logs appear
3. If `signInWithPopup` is failing silently, switch to `signInWithRedirect` as primary
4. If the cookie isn't being sent back after redirect, check `SameSite`/`Secure` cookie attributes vs Traefik SSL termination
5. If nothing else works, try a completely different auth approach: use Firebase `signInWithCredential` with a custom token, or use NextAuth.js as a wrapper

---

## WHAT WORKS

Everything else works. The platform is fully built:
- 28 API routes (all auth-protected)
- $20 budget system with live tracking
- 9 Remotion walkthrough videos
- MCP Gateway with 17 tools
- Live Look In dashboard
- Mobile responsive
- Beta onboarding with 20 invite links

The ONLY blocker is this login loop.
