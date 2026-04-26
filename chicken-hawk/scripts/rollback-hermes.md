# Rollback — Hermes Agent → direct Telegram fallback

Per Betty-Anne_Ang's coaching note on Wave 1 Step C scope: explicit
rollback path so any operator can revert at 2 a.m. without reading code.

## When to use this

- Hermes Agent container won't come up cleanly on aims-vps
- `/notify` returning non-2xx for >5 min
- Owner reports Telegram messages stop arriving after Step C deploy
- Any other reason you want to bypass Hermes and go straight to Telegram

## Rollback (one-liner — no code revert needed)

The notifier already degrades gracefully — flipping `HERMES_BASE_URL` to
empty string makes every magic-link call short-circuit to the existing
direct-Telegram path on the very next request:

```bash
ssh myclaw-vps
cd /opt/chicken-hawk
sed -i 's|^HERMES_BASE_URL=.*|HERMES_BASE_URL=|' .env
docker compose restart hawk-gateway
```

Verify:

```bash
curl -i -X POST https://hawk.foai.cloud/login -d 'email=asg@achievemor.io'
# expect: 200 + Telegram message arrives via direct path
docker logs chicken-hawk-hawk-gateway-1 --tail 50 | grep -i hermes
# expect: "hermes_not_configured" log line + zero "hermes_dispatch_*" lines
```

## Re-engage Hermes (after fix)

Once Hermes is back to healthy:

```bash
ssh myclaw-vps
cd /opt/chicken-hawk
sed -i 's|^HERMES_BASE_URL=.*|HERMES_BASE_URL=http://hermes:7080|' .env
docker compose restart hawk-gateway
```

Smoke:

```bash
curl -X POST https://hermes.foai.cloud/notify \
  -H "Authorization: Bearer $HERMES_BEARER" \
  -d '{"channel":"telegram","message":"hermes re-engaged","urgency":"low"}'
# expect: 200 + Telegram arrives
```

## Why this works without a code revert

`gateway/notifier.py:notify_owner()` returns False on any
unconfigured/unreachable/non-2xx response. `gateway/auth.py` checks the
return value and falls through to `_send_telegram(msg)` when False. The
direct path was never removed — it's the always-available safety net.
