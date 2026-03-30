# Beta Onboarding Funnel

**Date:** 2026-03-30
**Status:** Approved
**Scope:** 20 single-use invite links, disclaimer, signup, Remotion walkthrough, Deploy Platform access

---

## 1. Invite Link System

### Single-use links

Format: `https://cti.foai.cloud/auth/redeem?key=CTI-XXXX-XXXX-XXXX`

- Owner generates 20 links from CTI Hub (existing `generateAccessKey()` in allowlist.ts)
- Each key is stored in `access_keys` table with `max_uses: 1`, `uses: 0`
- When redeemed, `uses` increments to 1 — link is dead, cannot be shared
- Expired/used links show: "This invite has already been used."

### Database

Uses existing `access_keys` table. Add if not present:

```sql
CREATE TABLE IF NOT EXISTS access_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  created_by TEXT NOT NULL,
  max_uses INT DEFAULT 1,
  uses INT DEFAULT 0,
  role TEXT DEFAULT 'beta-tester',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);
```

### Generation endpoint

`POST /api/access-keys` (owner-only) — generates N keys, returns the full URLs.

---

## 2. Redeem Flow

### Page: `/auth/redeem?key=CTI-XXXX-XXXX-XXXX`

**Step 1 — Disclaimer**

Full-screen dark page with Deploy branding:

```
Welcome to The Deploy Platform — Beta Test

You've been invited to test an AI-native operations platform.

By continuing, you acknowledge:
- This is a beta test environment
- Your usage will be tracked to improve the platform
- We may collect feedback and usage analytics
- Push the boundaries — we want to know what breaks

[ ACCEPT & SIGN UP ]    [ DECLINE ]
```

**Step 2 — Firebase Sign Up**

On accept, Firebase auth UI appears:
- Google OAuth
- Phone auth
- Email/password

On successful signup:
- Key is consumed (uses incremented)
- User email added to `allowed_users` table with role `beta-tester`
- User provisioned in profiles table
- Redirect to walkthrough

**Step 3 — Walkthrough Videos**

Page: `/auth/welcome`

Shows 6 Remotion videos in sequence (autoplay next, or user can skip). Each up to 25 seconds.

After all videos (or skip): redirect to `/chat`

---

## 3. Remotion Walkthrough Videos

6 standalone videos, each up to 25 seconds. Built with Remotion. Dark theme matching the platform. Bold text overlays, animated screen captures, pointer annotations.

### Video 1: What is The Deploy Platform (25s)

- Deploy logo materializes
- Text: "An AI-native application factory"
- Animated list fades in: "Research. Build. Deploy. Monitor."
- Text: "From conversation to production — no devops required"
- Deploy logo pulses

### Video 2: Meet ACHEEVY (25s)

- ACHEEVY hero image slides in
- Text: "Your Digital CEO"
- Chat bubble animation: user types, ACHEEVY responds
- Text: "ACHEEVY remembers everything across sessions"
- Text: "Delegates to a fleet of specialized agents"
- Agent names flash: Chicken Hawk, Scout_Ang, Edu_Ang, Visual Engine

### Video 3: How to Chat (25s)

- Mock chat screen appears
- Pointer highlights "Manage It" card
- Text: "Give a prompt. ACHEEVY handles it. (2-5 min)"
- Pointer moves to "Guide Me" card
- Text: "Work together through Q&A. (4-10 min)"
- Pointer moves to message input
- Text: "Or just talk — ACHEEVY figures out the rest"

### Video 4: Image Generation (25s)

- User types "create a bull frog with a cape"
- Reasoning block appears: "Routing to Visual Engine..."
- Agent badge: "Routed to Visual Engine"
- Model selector fans out: Nano Banana Pro 2, Canvas Engine, Flux Ultra
- User picks 1
- Image generates and fills frame
- Text: "3 engines. Your choice."

### Video 5: Cost Tracking — LUC (25s)

- LUC badge in footer pulses
- Text: "Every action has a cost"
- Streaming cost ticker animates: $0.0001... $0.0003... $0.0005
- Budget bar animates: "$20.00 → $19.95"
- Text: "Full transparency. Every token counted."
- Text: "You control the budget"

### Video 6: Give Us Feedback (25s)

- Text: "This is a beta"
- Text: "Push the boundaries"
- Animated list: "Break things. Request features. Tell us what's missing."
- Feedback button pulses
- Text: "Your usage shapes what we build next"
- Deploy logo + "Thank you for testing"

### Technical implementation

- Each video is a Remotion composition in `src/components/video/walkthrough/`
- Uses `@remotion/player` for inline playback on the welcome page
- Videos are 1080x1920 (mobile-first) and 1920x1080 (desktop)
- No audio — text + animation only
- Uses existing brand: dark bg (#0A0A0A), accent (#E8A020), mono font

---

## 4. Access Control

### Owner (you)

- Full CTI Hub access (all dashboard pages)
- Can generate/manage invite keys
- Can reset budget
- Can view all user activity

### Beta tester (invitees)

- Deploy Platform access only: `/chat`, `/projects`, `/settings`
- No access to: `/plug-bin`, `/live`, `/enrollments`, `/team`, `/pricing`, admin features
- Budget-limited (shared $20 POC budget)
- Usage tracked in `budget_ledger`

### Dashboard layout changes

Sidebar shows different nav items based on role:
- Owner: all 9 nav items
- Beta tester: HOME, WORKFLOWS, ACCOUNT (3 items)

---

## 5. Files to create

### New files
- `src/app/auth/redeem/page.tsx` — disclaimer + signup flow (modify existing if present)
- `src/app/auth/welcome/page.tsx` — walkthrough video player
- `src/components/video/walkthrough/Scene1Platform.tsx`
- `src/components/video/walkthrough/Scene2Acheevy.tsx`
- `src/components/video/walkthrough/Scene3Chat.tsx`
- `src/components/video/walkthrough/Scene4ImageGen.tsx`
- `src/components/video/walkthrough/Scene5LUC.tsx`
- `src/components/video/walkthrough/Scene6Feedback.tsx`
- `src/components/video/walkthrough/WalkthroughRoot.tsx` — Remotion root
- `sql/005-access-keys.sql` — access keys table if not exists

### Modified files
- `src/app/(dashboard)/layout.tsx` — role-based nav filtering
- `src/app/api/access-keys/route.ts` — bulk key generation
- `src/app/api/access-keys/redeem/route.ts` — consume key + provision
- `src/lib/allowlist.ts` — role types
- `src/context/auth-provider.tsx` — store user role, pass to context
