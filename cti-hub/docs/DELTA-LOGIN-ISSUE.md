# DELTA: Login Loop Issue — CTI Hub

**Date:** March 30, 2026
**Status:** UNRESOLVED
**Reporter:** Rish (owner)
**Platform:** cti.foai.cloud

---

## Problem

After clicking "Sign in with Google" on `https://cti.foai.cloud/auth/login`, the Google auth popup completes successfully, but the user is redirected back to the login page instead of reaching `/chat`. This happens with both owner emails:
- `bpo@achievemor.io`
- `jarrett.risher@gmail.com`

The loop is: Login → Google popup → Auth succeeds → Back to login page → Repeat.

---

## What Was Tried (All Failed)

1. **Redirect target changed** from `/` to `/chat` — still loops
2. **`router.push` vs `window.location.replace`** — both loop back
3. **Removed aggressive auth redirect** from chat page that sent unauthenticated users to `/auth/login` — still loops
4. **Made provision endpoint non-fatal** on cookie verification failure — still loops
5. **Set user state before session cookie** to unblock UI immediately — still loops
6. **Added logging** (`console.log/error`) to auth provider — user reports same behavior regardless
7. **Rebuilt Docker image** multiple times with `--no-cache` — still loops

---

## Root Cause Hypotheses

### H1: Session cookie never gets set (MOST LIKELY)
The `/api/auth/session` endpoint now verifies Firebase tokens via Admin SDK before setting the `httpOnly` cookie. If verification fails silently, the cookie is never set. Without the cookie, all API calls return 401, and the app appears broken despite Firebase auth succeeding.

**Evidence:** Before the hardening changes, login worked. The session endpoint used to accept any token string. Now it verifies first.

**Test needed:** Check browser DevTools → Application → Cookies after login attempt. Is `firebase-auth-token` present?

### H2: `onAuthStateChanged` fires but verify/provision chain fails
The auth provider's `onAuthStateChanged` callback makes 3-4 sequential API calls:
1. `GET /api/access-keys/verify?email=...` — rate limited (10/min per IP)
2. `POST /api/auth/session` — verifies token, sets cookie
3. `POST /api/auth/provision` — provisions user in DB
4. Profile hydration calls (`/api/auth/profile`, `/api/auth/organization`, `/api/paywall/tier-limits`)

If ANY of these fail with an unhandled error, `setUser()` might never execute, or the catch block resets state.

### H3: Google auth is falling back to redirect flow
If `signInWithPopup` fails (popup blocked by browser), it falls back to `signInWithRedirect`. This causes a full page reload. After reload, `getRedirectResult` is called, but if it doesn't resolve properly, the user appears unauthenticated.

### H4: Firebase `authDomain` mismatch
`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` is set to `foai-aims.firebaseapp.com` in the env vars. The app runs on `cti.foai.cloud`. While `cti.foai.cloud` is in Firebase's authorized domains list, the popup auth flow opens on `foai-aims.firebaseapp.com` which may cause cross-origin cookie issues.

### H5: Cookie `secure` flag in non-HTTPS dev context
The cookie is set with `secure: process.env.NODE_ENV === 'production'`. Inside the Docker container, `NODE_ENV=production`, so `secure: true`. This is correct for HTTPS. But if Traefik terminates SSL and forwards as HTTP internally, the cookie might not be sent back.

---

## Timeline of Changes That Broke Login

The login worked before these changes were made in the hardening session:

1. **`/api/auth/session`** — Added `verifyIdToken()` check before setting cookie (was: accept any token string)
2. **`/api/auth/provision`** — Changed catch block from "allow anyway" to return 401
3. **Auth provider** — Added `setUser()` before provision, made hydration non-fatal
4. **Chat page** — Added/removed auth redirect multiple times
5. **Login page** — Changed redirect from `/` to `/chat`, changed from `window.location.href` to `router.push` to `window.location.replace`

---

## Recommended Fix

**REVERT the session endpoint to not verify tokens before setting the cookie.** The cookie value IS a Firebase ID token — it gets verified on every API call via `requireAuth()`. Verifying it twice (once when setting, once when using) is redundant and is the most likely cause of the failure.

```typescript
// /api/auth/session POST — REVERT TO:
const response = buildCookieResponse();
response.cookies.set({
  name: COOKIE_NAME,
  value: accessToken, // Store as-is, verify on use
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: COOKIE_MAX_AGE_SECONDS,
});
return response;
```

This was the original behavior before hardening. The security is maintained because `requireAuth()` verifies the token on every API call. Double-verification at cookie-set time adds no security but creates a point of failure.

---

## Files Involved

| File | Role |
|------|------|
| `src/app/auth/login/page.tsx` | Login page — redirect after auth |
| `src/context/auth-provider.tsx` | Auth state management — onAuthStateChanged flow |
| `src/lib/auth-paywall.ts` | signInWithOAuth, provisionFirebaseUser |
| `src/app/api/auth/session/route.ts` | Session cookie — THE LIKELY CULPRIT |
| `src/app/api/auth/provision/route.ts` | User provisioning |
| `src/app/api/access-keys/verify/route.ts` | Email allowlist check |
| `src/lib/firebase-admin.ts` | Admin SDK init |
| `src/lib/firebase.ts` | Client SDK init |
| `.env.local` / `.env.production` | Firebase config vars |

---

## File Location

Project: `C:\Users\rishj\foai\cti-hub`
VPS: `/opt/foai-cti` on `myclaw-vps` (31.97.133.29)
Repo: `github.com/BoomerAng9/foai` branch `feat/cti-hub-production-deploy`
