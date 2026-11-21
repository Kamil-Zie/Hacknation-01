# T-065 Backend prod image (Synology): build with esbuild, run with production deps only
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY database/package.json database/
RUN npm ci --ignore-scripts
COPY apps/backend apps/backend
RUN npm run build -w apps/backend

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY database/package.json database/
RUN npm ci --omit=dev --ignore-scripts -w apps/backend && npm cache clean --force
COPY --from=build /app/apps/backend/dist apps/backend/dist
WORKDIR /app/apps/backend
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
