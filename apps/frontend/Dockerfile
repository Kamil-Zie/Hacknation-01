# T-065 Frontend prod image: built in GitHub Actions (.github/workflows/images.yml) for amd64 + arm64, pulled by the NAS.
# The Vite build runs once on the CI machine ($BUILDPLATFORM); the target image is plain nginx with static files.
FROM --platform=$BUILDPLATFORM node:22.13.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY database/package.json database/
RUN npm ci --ignore-scripts
COPY contracts contracts
COPY apps/frontend apps/frontend
ARG VITE_API_URL=https://api.kamil-zielinski.pl/api/v1
ENV VITE_API_URL=$VITE_API_URL VITE_USE_MOCKS=false
RUN npm run build -w apps/frontend

FROM nginx:1.27-alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
