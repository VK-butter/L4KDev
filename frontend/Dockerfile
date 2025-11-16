# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat \
  && corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend ./backend
COPY frontend ./frontend
COPY shared ./shared

RUN pnpm install --frozen-lockfile
RUN pnpm --filter sale-dashboard-shared run build

ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter sale-dashboard-frontend run build

FROM nginx:1.27-alpine AS runtime
COPY deployment/nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
