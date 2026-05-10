# Wiring Obsidian into Chicken Hawk — owner-only data lane

> **Access tier:** owner-bound session ONLY (per `feedback_ch_access_tier_canon.md`).
> Anonymous public visitors NEVER reach this surface. Operator-with-shared-secret ≠ owner here either —
> only sessions whose magic-link bound to `OWNER_EMAIL` may invoke the obsidian.* MCP tools.

## Architecture

```
  Owner's machine                   aims-vps (Hermes Agent container)
  ┌─────────────────┐              ┌──────────────────────────────┐
  │ Obsidian        │              │ Hermes Agent runtime         │
  │ Local REST API  │   Tailscale  │  ↳ MCP server: obsidian-mcp  │
  │ plugin          │ ←──────────→ │  ↳ MCP server: chicken-hawk  │
  │ :27124 (HTTPS,  │              │  ↳ MCP server: memory        │
  │  API-key auth)  │              │     ...                      │
  └─────────────────┘              └──────────────┬───────────────┘
                                                  │
                                                  ▼
                                          hawk.foai.cloud/run
                                          (NemoClaw-gated dispatch)
                                                  │
                                                  ▼
                                          Owner-tier session only
                                          (cookie binds to OWNER_EMAIL)
```

The Hermes Agent runtime hosts an `obsidian-mcp` server. When Chicken Hawk needs to read
or write owner notes, it routes the request through Hermes' MCP layer — and that layer
checks owner-tier authentication before the MCP call fires.

## What you (owner) do — one-time setup

### 1. Install the Obsidian Local REST API plugin

In Obsidian:
- **Settings → Community plugins → Browse**
- Search for *"Local REST API"* by Adam Coddington
- Install + Enable
- Settings → Community plugins → **Local REST API → Settings**:
  - Enable HTTPS (recommended) or HTTP
  - Note the auto-generated **API Key** (long random string)
  - Note the **Port** (default `27124` HTTPS, `27123` HTTP)

### 2. Make the plugin reachable from aims-vps

Two acceptable paths:

**Path A (preferred): Tailscale**
- Install Tailscale on the Windows machine running Obsidian (`tailscale up`)
- Add aims-vps to the same tailnet (already done — confirm with `tailscale status`)
- The plugin's port becomes reachable at `https://<your-tailscale-hostname>:27124`

**Path B (fallback): Cloudflare Tunnel**
- Use `cloudflared tunnel --url localhost:27124` to expose the plugin
- Pin the resulting URL into the env var below

### 3. Land three values into `/docker/chicken-hawk/.env` on myclaw-vps and `/docker/coastal-brewing/.env` on aims-vps

```ini
OBSIDIAN_API_BASE=https://<tailscale-hostname>:27124
OBSIDIAN_API_KEY=<the long random string from step 1>
OBSIDIAN_VAULT_NAME=<your vault name as shown in Obsidian's left rail>
```

`OBSIDIAN_VAULT_NAME` is just for display — the plugin only operates on the active vault.

## What I (Claude/CH) do once the env lands

### 4. Add `obsidian-mcp` to Hermes Agent's MCP config

On aims-vps, edit `/opt/data/config.yaml`:

```yaml
mcp:
  servers:
    sequential-thinking: { ... existing ... }
    coastal-fs:          { ... existing ... }
    memory:              { ... existing ... }
    chicken-hawk:        { ... existing ... }
    obsidian:
      command: npx
      args: ["-y", "@modelcontextprotocol/server-obsidian"]
      env:
        OBSIDIAN_API_KEY: ${OBSIDIAN_API_KEY}
        OBSIDIAN_API_BASE: ${OBSIDIAN_API_BASE}
      access_tier: owner   # <-- read by Hermes' MCP gateway, refuses non-owner sessions
```

The `access_tier: owner` flag is what enforces the access-tier canon at the MCP layer.

### 5. Add a Tool Chest panel at `/tools/obsidian`

Operator-only page (already gated by `require_auth` at the Next.js layer). Shows:
- Recent notes (paginated list)
- Search (full-text via plugin's `/search/` endpoint)
- "Drop note from chat" button — pipes current chat selection into a new note
- "Pin note as context" button — adds a note's content to CH's working context for the next exchange

### 6. Add four MCP tool actions to chicken-hawk's NemoClaw catalog

These get routed through `/run` so every Obsidian read/write writes a receipt to the audit chain:

| Action | Effect | Risk tags |
|---|---|---|
| `obsidian.list_notes` | List notes by folder/tag | (none — read-only) |
| `obsidian.read_note` | Return body of a single note | (none — read-only) |
| `obsidian.append_note` | Append to existing note | `final_public` if note is in `Public/` |
| `obsidian.create_note` | Create new note | `final_public` if note is in `Public/` |

NemoClaw escalates to owner Telegram approval for any `final_public` action — same pattern as the rest of CH.

## What Obsidian unlocks

- **Context grounding:** CH can pull from owner's project notes when answering complex questions ("what was the Coastal launch plan timeline again?")
- **Capture:** drop CH chat output as a note in the right folder with one click
- **Long-term memory companion to ReMe:** ReMe handles agent-side memory; Obsidian handles owner-side knowledge graph
- **Cross-link with audit chain:** every CH action that touches Obsidian gets a receipt — provable trail

## What Obsidian does NOT unlock

- Public visitors: nothing changes — they can't reach this surface, never could
- Operator-tier (shared secret only): also nothing — the `access_tier: owner` flag blocks at the MCP gateway
- Anonymous prompt-injection / phishing: the persona refuses any obsidian-related question on the public chat (per hardened persona prompt). Even a successful jailbreak couldn't reach the MCP — it's not in the persona's toolchain.

## Open items waiting on you

- [ ] Install Obsidian Local REST API plugin
- [ ] Confirm Tailscale or expose-method
- [ ] Drop the three env vars into the two `.env` files (myclaw-vps + aims-vps)
- [ ] Confirm vault path (so the panel shows the right folder structure)

Once those land, I ship the Hermes config, the panel, and the four NemoClaw actions in one PR.
