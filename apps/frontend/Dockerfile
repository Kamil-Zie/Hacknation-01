# T-065 Frontend prod image (Synology): Vite build with the prod API URL, served by nginx
FROM node:22-alpine AS build
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
