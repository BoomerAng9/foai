# Rollback — Hermes Agent (Wave 1 Step C, Path 1)

Hermes Agent runs on aims-vps as the owner's INBOUND command surface
(owner chats Telegram/Slack/etc → Hermes invokes chicken-hawk tools).
It is NOT in the magic-link login critical path — that stays on direct
Telegram via `auth._send_telegram`. So "rollback" here means stopping
Hermes, not unwinding any chicken-hawk-side wiring.

## When to use this

- Hermes container won't come up cleanly on aims-vps
- Hermes is responding slowly or failing to invoke chicken-hawk tools
- Owner wants to stop Hermes (e.g. cost burn, channel testing breakage)

## Rollback (one-liner — no code revert needed)

```bash
ssh aims-vps
cd ~/foai/coastal-brewing
docker compose stop hermes
```

That's it. Owner can still:
- Log in via magic link (direct Telegram path — unchanged)
- Browse the Chicken Hawk operator dashboard at `/me`
- Use `curl` against `https://hawk.foai.cloud/run` directly

What stops working:
- Owner can't dispatch tools by chatting Telegram/Slack/etc
- Hermes' approval-button HITL flow is offline

## Re-engage Hermes (after fix)

```bash
ssh aims-vps
cd ~/foai/coastal-brewing
docker compose up -d hermes
docker logs hermes --tail 50
# wait for "gateway started" line
```

Smoke:
```bash
# DM the Hermes Telegram bot with "what is the audit trail for task xyz"
# expect: Hermes calls chicken-hawk /audit/{id} → reply with receipts
```

## Why no chicken-hawk-side rollback is needed

`gateway/notifier.py` is a Wave 2 placeholder — `notify_owner()` always
returns False so `auth.py`'s fallback chain transparently routes around
it to direct Telegram. Hermes outage has zero impact on magic-link
delivery. The only thing Hermes carries is the inbound chat surface,
which is owner convenience, not infra-critical.

## If you actually want to nuke Hermes entirely

```bash
ssh aims-vps
cd ~/foai/coastal-brewing
docker compose stop hermes
docker compose rm -f hermes
docker rmi hermes-agent:9be83728  # remove the locally-built image
```

(Re-deploy from the compose service block + Dockerfile in the repo.)
