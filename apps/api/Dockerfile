# syntax=docker/dockerfile:1
# Build context is the REPO ROOT: the API consumes @masterpokedex/db and
# @masterpokedex/shared as raw workspace TypeScript through tsx, so the image
# must carry those sources alongside apps/api.
#
#   docker build -f apps/api/Dockerfile .
#
# Stage order matters: Railway and plain `docker build` build the LAST stage
# (prod); docker-compose picks `target: dev` for the one-shot seed service.

FROM node:24-alpine AS manifests
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci validates the lockfile against every workspace manifest, so apps/web's
# must be present even though its dependencies are never installed here.
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

# ── dev: full install (drizzle-kit, tsx, typescript) — compose seed service ──
FROM manifests AS dev
RUN npm ci --include-workspace-root \
      -w @masterpokedex/api -w @masterpokedex/db -w @masterpokedex/shared
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY apps/api apps/api
CMD ["node", "--import", "tsx", "apps/api/src/server.ts"]

# ── prod: runtime deps only — Railway and the compose api service ──
FROM manifests AS prod
RUN npm ci --omit=dev --include-workspace-root \
      -w @masterpokedex/api -w @masterpokedex/db -w @masterpokedex/shared
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY apps/api apps/api
ENV NODE_ENV=production
EXPOSE 8787
# Single node process (no npm wrapper) so SIGTERM reaches server.ts's drain handler.
CMD ["node", "--import", "tsx", "apps/api/src/server.ts"]
