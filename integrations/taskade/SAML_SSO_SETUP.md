# SAML SSO Setup — Taskade "The Future of A.I." Organization

**Identity Provider:** Google Workspace (achievemor.io tenant)
**Service Provider:** Taskade Inc. — Org "The Future of A.I."
**Default Workspace (NOT changeable post-config):** **The Future of AI**
**Owner action time:** ~15 minutes
**Date:** 2026-05-14

---

## Why SAML SSO here

Federating Taskade with Google Workspace gives the owner one canonical sign-in surface (the same account that already gates `noreply@achievemor.io` Workspace mailbox + magic-link email canon). When future Boomer_Angs or consultancy team members need owner-tier Taskade access, you add them to the relevant Google Workspace org-unit and they inherit Taskade access automatically — no per-user Taskade invite + password reset cycle.

## The two halves of the setup

This is a **two-sided handshake**. Both halves must complete or SSO fails.

```
┌─────────────────────────────────────┐         ┌─────────────────────────────────┐
│  Google Workspace                   │   ←→    │  Taskade — The Future of A.I.   │
│  (IDP — issues SAML assertions)     │         │  (SP — consumes SAML assertions)│
│                                     │         │                                 │
│  → SSO URL                          │  paste  │                                 │
│  → Entity ID (Issuer)               │  ──→    │  ← Domain (achievemor.io)       │
│  → X.509 Public Cert                │         │  ← SSO URL                      │
│                                     │         │  ← IDP Issuer                   │
│  ← ACS URL (Taskade's callback)     │  ←──    │  ← X.509 Cert paste             │
│  ← Entity ID (Taskade's identifier) │  paste  │  ← Default Workspace selector   │
└─────────────────────────────────────┘         └─────────────────────────────────┘
```

## Half 1 — Configure Google Workspace as the IDP

**You need:** Google Workspace Super Admin access to `achievemor.io`.

1. Sign in to **admin.google.com** as Super Admin.
2. Navigate: **Apps → Web and mobile apps → Add app → Add custom SAML app**.
3. **App details:**
   - App name: `Taskade — The Future of A.I.`
   - Description: `SAML SSO for FOAI's Taskade Organization`
   - App icon: upload an ACHIEVEMOR + Taskade lockup (optional — can skip and add later)
   - Click **Continue**.
4. **Google Identity Provider details — COPY THESE 3 VALUES** (you paste them into Taskade in Half 2):
   - **SSO URL** (something like `https://accounts.google.com/o/saml2/idp?idpid=...`)
   - **Entity ID** (the IDP Issuer — `https://accounts.google.com/o/saml2?idpid=...`)
   - **Certificate** — click **DOWNLOAD CERTIFICATE**. Saves as `.pem` or `.cer`. Keep the file handy.
   - Click **Continue**.
5. **Service provider details — fill these from Taskade in Half 2** (leave open in another tab):
   - ACS URL: `<from Taskade>` — Taskade gives you this in their SSO config form
   - Entity ID: `<from Taskade>` — Taskade gives you this too
   - Name ID format: `EMAIL`
   - Name ID: `Basic Information > Primary email`
   - Click **Continue**.
6. **Attribute mapping** (Taskade's expected SAML attributes):
   - Google Directory attribute → App attribute:
     - **Primary email** → `email`
     - **First name** → `first_name`
     - **Last name** → `last_name`
   - Click **Finish**.
7. **Turn on the app** for the right org unit:
   - From the app page, click **User access**.
   - Select **ON for everyone** OR scope to a sub-org-unit like `/achievemor.io/owners` if you have one set up.
   - Save.

**At this point, Google Workspace has issued the SAML config but Taskade doesn't trust it yet — proceed to Half 2.**

## Half 2 — Configure Taskade as the SP

**You need:** Taskade Org owner access (the same account that already owns The Future of A.I. Organization).

1. Sign in to **taskade.com** as Org owner.
2. Navigate: **Org Settings → Security → SAML SSO** (path may differ slightly; look for "SAML" or "SSO" in the Org admin sidebar).
3. **Enter the domain:** `achievemor.io`
4. **SSO URL:** paste the value from Half 1 step 4 (Google's `https://accounts.google.com/o/saml2/idp?...`)
5. **IDP Issuer:** paste the value from Half 1 step 4 (Google's Entity ID, `https://accounts.google.com/o/saml2?idpid=...`)
6. **IDP Public Signing Certificate:** open the `.pem` / `.cer` file you downloaded in Half 1 step 4, copy its full contents (including `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`), paste into the field.
7. **Default workspace** (CRITICAL — NOT CHANGEABLE WITHOUT TASKADE SUPPORT TICKET): select **The Future of AI**.
8. **Save / Enable SSO.**

Taskade now shows you ITS service-provider details — TWO values to paste back into Google Workspace (Half 1 step 5):
- **ACS URL** (Taskade's Assertion Consumer Service endpoint — something like `https://www.taskade.com/sso/acs/<org_slug>`)
- **Entity ID** (Taskade's SP identifier)

Switch back to your Google Workspace tab, finish step 5, save.

## Test plan

1. Open an **incognito / private window** (avoids cached Taskade cookies).
2. Navigate to: `https://www.taskade.com/login?org=the-future-of-ai`
3. Choose **Sign in with SSO** (or whatever Taskade's SAML entry point looks like — usually a button labeled "SSO" or "Use your company login").
4. Enter your `achievemor.io` email; Taskade redirects to Google.
5. Google authenticates (you're already signed in to Workspace in the parent tab — depending on session state, you might just see a "select account" page).
6. Google issues SAML assertion → redirects back to Taskade → you land in The Future of AI workspace, signed in.

**If it fails:**
- Check the URL bar for an error parameter (Taskade often shows `?error=saml_assertion_invalid` or similar).
- Common causes:
  - Mismatched Entity ID between Google and Taskade
  - Stale certificate (Google rotated since you pasted)
  - Wrong attribute mapping (Taskade expects `email` not `Email`, etc — verify casing exactly matches Half 1 step 6)
  - ACS URL typo when pasting Taskade's value back into Google
- Quick rollback: turn SAML SSO **off** in Taskade (Half 2 step 8 toggle) to restore email/password sign-in. Then debug.

## Cert rotation (recurring owner action)

Google Workspace SAML signing certs have an **expiry** (typically 5 years from generation). When Google rotates:

1. Owner receives a Google Workspace Admin notification 60 days before expiry.
2. Download the new cert from Google Workspace Admin → Apps → custom SAML app → Service provider details.
3. Paste new cert into Taskade Org Settings → Security → SAML SSO → IDP Public Signing Certificate field.
4. Save.
5. Re-test SSO from incognito.

**Action item:** add a Google Calendar reminder for 60 days before cert expiry. Owner sets this once at initial config.

## Service-account access (NOT SAML)

The Taskade API tokens (`Taskade_Deploy_API_Token`, `Taskade_Sync_Service_Token`) are SEPARATE from SAML. SAML is for human owner sign-in. API tokens are for service-to-service (adapter, sync worker, HRPMO loop) and require no user authentication — they authenticate by Bearer token in the `Authorization` header.

Per Phase 3 of the integration plan: tokens stored in openclaw vault (MixedCase), piped to containers as UPPERCASE env vars. SAML setup does not affect token-based access.

## After SAML lands — verification checklist for the integration plan

- [ ] Owner SSO sign-in works from incognito at `https://www.taskade.com/login?org=the-future-of-ai`
- [ ] Default workspace lands on "The Future of AI" after sign-in
- [ ] Owner email exactly matches what Google sends (verify Taskade user profile shows `asg@achievemor.io`, not a duplicate / additional account)
- [ ] No Google Workspace Admin notification banner about misconfigured SAML
- [ ] Cert expiry date noted; calendar reminder set
- [ ] PROOF_BUNDLE.md updated with SAML test screenshots (owner-tier evidence)

## Open questions

1. **Just-in-Time (JIT) user provisioning:** does Taskade auto-create a Taskade user when a new Google Workspace user (added to the org unit) first signs in? Or does owner need to pre-invite? Verify in Taskade docs during setup.
2. **Domain enforcement:** once SAML is on, does Taskade reject email/password sign-in for `achievemor.io` users (forcing SAML)? Verify behavior — depending on Taskade's "Allowed Domains" setting, mixed-mode sign-in might still be possible.
3. **Multi-IDP:** if FOAI later wants to federate with a non-Google IDP (e.g., for a consultancy client whose users are on Okta), can Taskade support multiple IDPs per Org? Per Taskade docs as of 2026-05-14: unclear. Phase 8 Genesis clone factory should provision a new Taskade Org per client (single IDP per Org), not try to add second IDP to The Future of A.I. Org.
