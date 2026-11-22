# T-065 Backend prod image: built in GitHub Actions (.github/workflows/images.yml) for amd64 + arm64, pulled by the NAS.
# npm runs only on the CI machine ($BUILDPLATFORM); the target image just copies pure-JS deps and the esbuild bundle.
FROM --platform=$BUILDPLATFORM node:22.13.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY database/package.json database/
RUN npm ci --ignore-scripts
COPY apps/backend apps/backend
RUN npm run build -w apps/backend

# production deps only (no native modules, so they run on any CPU)
FROM --platform=$BUILDPLATFORM node:22.13.0-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY database/package.json database/
RUN npm ci --omit=dev --ignore-scripts -w apps/backend && npm cache clean --force

FROM node:22.13.0-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/backend/package.json apps/backend/
COPY --from=build /app/apps/backend/dist apps/backend/dist
WORKDIR /app/apps/backend
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
