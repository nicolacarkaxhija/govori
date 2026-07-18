# Build stage: compile the PWA (same-origin api unless VITE_API_URL says otherwise).
# VITE_INSTANCE is required: the build fails fast without an instance (ADR 0029).
FROM node:24-slim AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY packs ./packs
COPY instances ./instances
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile --filter @glotty/web... --filter .
ARG VITE_INSTANCE
ENV VITE_INSTANCE=${VITE_INSTANCE}
RUN pnpm exec turbo run build --filter=@glotty/web

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/dist /srv/web
