# Traefik routing — sqwaadrun.foai.cloud

The Sqwaadrun gets a dedicated subdomain that points at the same
`cti-hub` container already serving `deploy.foai.cloud` and
`cti.foai.cloud`. The Next.js middleware (`cti-hub/src/middleware.ts`)
detects the `sqwaadrun.foai.cloud` hostname and rewrites root to
`/plug/sqwaadrun`.

This is a **DNS + TLS + Traefik label** change only. No new container.

## 1. DNS

Add an A record (or CNAME) for `sqwaadrun.foai.cloud` pointing at
the same myclaw-vps IP that already hosts `deploy.foai.cloud`.

## 2. Traefik labels — drop into your cti-hub service

If your cti-hub service is in a docker-compose file (typical layout
on myclaw-vps), add these labels alongside the existing `deploy.foai.cloud`
and `cti.foai.cloud` rules. The `||` operator on the host rule means
all three hostnames hit the same router/service:

```yaml
services:
  cti-hub:
    # ... existing image, env, volumes ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.cti-hub.rule=Host(`deploy.foai.cloud`) || Host(`cti.foai.cloud`) || Host(`sqwaadrun.foai.cloud`)"
      - "traefik.http.routers.cti-hub.entrypoints=websecure"
      - "traefik.http.routers.cti-hub.tls.certresolver=letsencrypt"
      - "traefik.http.services.cti-hub.loadbalancer.server.port=3000"

      # Optional: dedicated router so the cert SAN list is explicit
      # and so you can apply different middlewares per hostname later.
      - "traefik.http.routers.sqwaadrun.rule=Host(`sqwaadrun.foai.cloud`)"
      - "traefik.http.routers.sqwaadrun.entrypoints=websecure"
      - "traefik.http.routers.sqwaadrun.tls.certresolver=letsencrypt"
      - "traefik.http.routers.sqwaadrun.service=cti-hub"
```

If you keep the dedicated router block, you can drop the
`sqwaadrun.foai.cloud` host from the combined rule.

## 3. Apply

```bash
ssh myclaw-vps
cd /opt/cti-hub          # wherever your compose lives
docker compose up -d cti-hub
docker logs -f cti-hub   # watch the middleware log "isSqwaadrunDomain" hits
```

## 4. Verify

```bash
curl -I https://sqwaadrun.foai.cloud/
# Expect 200 with the rewrite landing on /plug/sqwaadrun

curl -s https://sqwaadrun.foai.cloud/ | grep -i "no job too big"
# Should match the new hero copy
```

## 5. Optional — strip path on subdomain

If you ever want `sqwaadrun.foai.cloud` to behave like a fully separate
site (no `/plug/` path leaking when users hover links), the cleanest
play is to add a Traefik path-strip middleware AND update the
middleware.ts rewrite to keep the path bare. Skip this for now —
the rewrite already handles root → /plug/sqwaadrun on all internal
links.
