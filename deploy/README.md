# Deployment

One Compose stack **per instance** (ADR 0029): Postgres, the api, and
Caddy serving the PWA while proxying api paths — one origin, no CORS in
production (ADR 0027). `GLOTTY_INSTANCE` names the product the stack
runs (e.g. `govori`); the project name, database, api process, and web
build all follow it, so instances run side by side from the same compose
file with separate `.env` files. There is no default instance — an
unset `GLOTTY_INSTANCE` refuses to boot.

## First deploy

```sh
cd deploy
cp .env.example .env      # fill GLOTTY_INSTANCE, POSTGRES_PASSWORD, AUTH_SECRET, PUBLIC_URL
docker compose -f compose.prod.yml up -d --build
```

Migrations run automatically when the api boots. Seed content:

```sh
docker compose -f compose.prod.yml exec api node dist/import-cli.js <artifact.json>
```

## Staging

Set `SITE_ADDRESS=:80` and front it with your edge of choice, or set a real
domain to let Caddy manage TLS. Protect staging by adding a `basic_auth`
block to the Caddyfile.

## Environment

| Variable                   | Meaning                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `GLOTTY_INSTANCE`          | Instance id this stack runs, e.g. `govori` (required)         |
| `POSTGRES_PASSWORD`        | Database password (required)                                  |
| `AUTH_SECRET`              | ≥32-char secret for session signing (required)                |
| `PUBLIC_URL`               | Public origin, e.g. `https://govori.example`                  |
| `SITE_ADDRESS`             | Caddy site address; `:80` behind a proxy, domain for auto-TLS |
| `HTTP_PORT` / `HTTPS_PORT` | Host ports (default 8080/8443)                                |
