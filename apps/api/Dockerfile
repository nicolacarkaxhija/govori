# Build stage: install the workspace and compile the api with its deps.
FROM node:24-slim AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @glotty/api... --filter .
RUN pnpm exec turbo run build --filter=@glotty/api

# Prune to a deployable package with production deps only.
RUN pnpm --filter @glotty/api --prod deploy /out --legacy

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
COPY --from=build /repo/apps/api/drizzle ./drizzle
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
