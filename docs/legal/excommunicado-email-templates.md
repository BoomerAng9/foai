# Excommunicado Email Templates

**Internal reference — NOT user-facing documentation.**
These are the email templates used by the A.I.M.S. moderation system.

---

## Template 1: First Offense Warning

**Subject:** Content Policy Warning — Action Required

---

{user_preferred_name},

We're writing to you directly because content on your account crossed a line we don't tolerate on this platform.

**What was flagged:**
{content_description}

**Why it was flagged:**
{violation_category} — see our Content Policy at {content_policy_url}

**What happened:**
The content has been removed from the platform effective immediately.

**What you need to understand:**
This is your one and only warning. We support your right to create. We support controversial opinions, edgy content, adult language, political commentary — all of it. What we do NOT support is deplorable content that causes genuine harm to real people.

The content above crossed that line.

**What happens if this occurs again:**
Your account will be permanently terminated. No appeal. No second conversation. No exception.

We'd rather keep you on the platform making real work. Don't give us a reason not to.

— The A.I.M.S. Moderation Team
{platform_name}

---

## Template 2: Second Offense — Excommunicado (Permanent Termination)

**Subject:** Account Permanently Terminated — Content Policy Violation

---

{user_preferred_name},

Your account on {platform_name} has been permanently terminated effective immediately.

**What was flagged:**
{content_description}

**Why:**
{violation_category}

**Background:**
You received a first-offense warning on {first_warning_date} for {first_violation_summary}. You were told clearly that a second offense would result in permanent termination.

You did it again.

**What this means:**
- Your account is gone. All content has been removed.
- There is no appeal process.
- There is no reinstatement.
- Attempts to create a new account will result in immediate re-termination.

We will not host this kind of content on our platform. Not now. Not ever.

Take it somewhere else.

— The A.I.M.S. Moderation Team
{platform_name}

---

## Template 3: CSAM — Immediate Termination + Law Enforcement

**Subject:** Account Terminated — Illegal Content — Law Enforcement Notified

---

Your account on {platform_name} has been permanently terminated effective immediately.

Content involving the sexual exploitation of minors was detected on your account. This content has been reported to the National Center for Missing & Exploited Children (NCMEC) and relevant law enforcement agencies.

There is no appeal. There is no contact channel.

— {platform_name}

---

## Template Variables

| Variable | Source |
|---|---|
| `{user_preferred_name}` | User profile → preferred_name (per ACHEEVY engagement SOP) |
| `{content_description}` | Moderation flag → content summary (written by reviewer, NOT auto-generated) |
| `{violation_category}` | One of: targeted_harassment, doxxing, deepfake_revenge_porn, violence_incitement, weapon_instructions, csam, minor_exploitation |
| `{content_policy_url}` | https://deploy.foai.cloud/legal/content-policy |
| `{first_warning_date}` | From user moderation record |
| `{first_violation_summary}` | From first-offense moderation record |
| `{platform_name}` | "The Deploy Platform" (user-facing) or "Per\|Form" depending on which surface |

---

## Implementation Notes

- First-offense emails are sent by the moderation system after human review confirms the flag
- Second-offense emails are sent immediately after human confirmation — no delay, no "cooling off" period
- CSAM emails are sent programmatically upon detection — no human review delay
- All moderation emails are logged in `user_moderation_log` (Neon) for audit trail
- The excommunicado exclusion list is maintained as a separate Neon table: `excommunicado_list` with email + identifying signals
- Grammar content filter layer generates the initial detection flags, but NEVER auto-bans. Human review is mandatory for all non-CSAM enforcement.
