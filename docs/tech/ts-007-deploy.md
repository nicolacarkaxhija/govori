---
id: ts-007
status: accepted
depends-on: [adr-0021, adr-0027, adr-0028]
---

# Deployment stack

Directory: `deploy/`. One VPS-shaped target: Docker Compose, one public
origin, Postgres alongside.

## Shape

- `apps/api/Dockerfile` — multi-stage: workspace build, `pnpm deploy`
  prune to production deps, `drizzle/` migrations copied, runs as `node`.
  Migrations run on boot (`main.ts`), so a fresh database self-provisions.
- `apps/web/Dockerfile` — Vite build handed to `caddy:2-alpine` with
  `deploy/Caddyfile`.
- `deploy/compose.prod.yml` — `db` (healthcheck-gated volume-backed
  Postgres), `api` (env-wired: `GOVORI_DB__URL`, `GOVORI_AUTH__SECRET`
  required, public URL for base/CORS), `web` (Caddy, ports 8080/8443).

## One origin (ADR 0027)

Caddy serves the PWA with an SPA fallback and proxies the API by path
match — the `@api` matcher must list every API route family; a path
missing there silently falls through to `index.html` (a real bug caught
when `/stats`, `/course`, and `/lessons/*` were added without updating
it). Same-origin means no CORS in production; dev and e2e inject
`VITE_API_URL` instead.

## Seeding a fresh instance

```sh
docker compose -f deploy/compose.prod.yml up -d
docker cp <artifacts> api:/tmp/ && docker compose exec api \
  node dist/import-cli.js /tmp/items.json          # then --curriculum, --drafts
```

Items must land before the curriculum (lesson rows reference item ids).
The first admin is promoted once via SQL; every later promotion happens
in the app's admin directory.

## Verification

Built and booted locally end to end: health through Caddy, PWA served,
items/course/review flows exercised against the seeded stack. TLS is
Caddy-automatic once `SITE_ADDRESS` is a real domain.
