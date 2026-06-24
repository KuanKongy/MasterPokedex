# syntax=docker/dockerfile:1
# Build context is the REPO ROOT. Runs the Vite dev server: it serves the
# /MasterPokedex/ base path as-is and reads VITE_* from process env at serve
# time, so no build-time env baking is needed. Production web hosting is
# GitHub Pages (see .github/workflows/deploy-web.yml), not this image.
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN npm ci --include-workspace-root -w @masterpokedex/web
COPY packages/shared packages/shared
COPY apps/web apps/web
WORKDIR /app/apps/web
EXPOSE 8080
# vite.config.ts already binds host "::" port 8080
CMD ["npm", "run", "dev"]
