# Page 1 — Circuit Box

> Control center + admin console + absorbed settings panel.
> Industrial control-panel aesthetic, dark navy/graphite + gold/orange accents (agenticai.net theme).

## What Circuit Box is

Circuit Box is the user's **command center**. It is NOT a log viewer (reasoning streams live in the PiP window — see `project_reasoning_stream_ui.md`). It IS the place where the user can:

- Pull the plug on a feature
- Toggle agents on/off
- Add, rotate, and revoke API keys (BYOK supported)
- Manage webhooks
- Inspect health of every component
- Customize the UI look & feel (themes, layout, branding)
- Open / close panels per their tier + admin grants
- Access the absorbed settings panel
- Drill into Plan + billing controls (linked to TPS_Report_Ang flows)

## Layout

Industrial control-panel grid. Reference images: `Image #3` and `Image #4` from the 2026-04-08 batch. Panels are draggable, resizable, hideable. Save layout per user.

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔒 SECURE  Circuit Box — System Management   [SYSTEM OPTIMAL] 🛑 │
├──────────────────────────────────────────────────────────────────┤
│ ┌────────────┬────────────┬────────────┬────────────┬──────────┐ │
│ │  PANEL 1   │  PANEL 2   │  PANEL 3   │  PANEL 4   │ PANEL 5  │ │
│ │ AI AGENTS  │   REPOS    │ EXTERNAL   │ VOICE STT  │ DEPLOY + │ │
│ │            │            │ INTEGRA-   │ /TTS       │ INFRA    │ │
│ │ - ACHEEVY  │ - 17 repos │ - Stripe   │ - Eleven   │ - Docker │ │
│ │ - Boomers  │ - sync     │ - GitHub   │   Labs     │ - Cloud- │ │
│ │ - Hawks    │   status   │ - CF Wrkr  │ - Deepgram │   flare  │ │
│ │ - TPS Rprt │ - error    │ - Postgres │ - Real-    │ - Worker │ │
│ │   _Ang     │   counts   │ - WebSock  │   time     │ - Backup │ │
│ └────────────┴────────────┴────────────┴────────────┴──────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ BOTTOM PANEL — Live event log / health alerts / status      │ │
│ │ [INFO] 10:10 user enabled Testing Agent                     │ │
│ │ [ALERT] 10:08 Repo 2 - UI tripped (timeout)                 │ │
│ │ [WARN] 09:55 Database backups nearing capacity              │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                                                  ┌──────────────┐
                                                  │ RIGHT PANEL  │
                                                  │ Component    │
                                                  │ detail view  │
                                                  │              │
                                                  │ - API keys   │
                                                  │   (masked)   │
                                                  │ - Rate limit │
                                                  │ - Latency    │
                                                  │ - Cost track │
                                                  │ - On/Off     │
                                                  └──────────────┘
```

## Settings panel (absorbed)

Per `project_circuit_box_lab_chamber_renames.md`: settings live INSIDE Circuit Box. No standalone `/settings` route. Settings are panels gated by visibility flags. Admin power flips flags to expose or hide sections.

### Settings sections (gated, non-exhaustive)

| Section | Default visibility | Notes |
|---|---|---|
| Account / Profile | always | Name, preferred name, email, avatar |
| Plan + Billing | always | Linked to TPS_Report_Ang `/api/pricing/*` |
| BYOK Keys | always | ElevenLabs, Deepgram, OpenAI, etc. CMEK-wrapped storage |
| Grammar Filter | always | On/off toggle (default ON per `project_grammar_always_on_ntntn.md`) |
| Voice Mode | paid plan only | Three paths: preloaded, custom spec, cloned |
| Compliance Posture | admin only | DoD gate phase, CMMC L1 self-attestation status |
| Webhook Manager | always | List + add + rotate webhooks |
| API Key Rotation | always | Force-rotate any vendor key |
| UI Theme | always | Color scheme, layout, panel arrangement |
| Whitelabel Branding | enterprise tier | Logo, colors, copy for whitelabel deploys |
| Feature Flags | admin only | Hidden / experimental features |
| Audit Log Export | admin only | Charter + Ledger downloads (per AVVA NOON Charter-Ledger protocol) |
| Plug Library | always | Installed aiPLUGs, marketplace, fork management |
| Storage Vault | always | OneDrive-alternative GCS+CMEK (per `project_smelteros_platform.md`) |

Admin can flip any section's visibility flag at runtime. New settings sections get added as new ecosystem capabilities ship — they slot into Circuit Box, never a separate surface.

## Right detail panel

When a user clicks any component in any panel, the right panel shows:
- Component name + class + status
- API keys (masked, never raw)
- Rate limits
- Timeout settings
- Retry policies
- Error handling mode
- Current load %
- Request count (lifetime + current period)
- Error rate
- Average response time
- Monthly usage
- "On / Off" master switch
- "Configure" deep link

## Bottom panel — alerts + audit trail

- Live event log scrolls upward
- Color-coded by severity ([INFO] gray, [ALERT] orange, [WARN] yellow, [ERROR] red)
- Filterable by source / time / severity
- Right-side micro-panel shows alert/warning counts + user access audit trail link

## Interactions

| Action | Result |
|---|---|
| Click component | Opens right detail panel |
| Toggle component | Pauses/resumes that component, logs to bottom panel |
| Right-click panel header | Opens panel-level menu (rename, hide, duplicate, export) |
| Drag panel by header | Repositions in grid |
| Drag corner | Resizes |
| `Cmd+K` / `Ctrl+K` | Quick search across all panels + components |
| Settings gear (top-right) | Opens settings panel overlay (still inside Circuit Box) |
| Big red button (top-right corner) | Master HALT — kills all running missions, requires confirm |

## Theme

agenticai.net / cti.foai.cloud aesthetic (dark navy/graphite + gold/orange). See `04-shared-design-system.md` for tokens.
