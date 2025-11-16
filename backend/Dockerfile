# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat \
  && corepack enable

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend ./backend
COPY frontend ./frontend
COPY shared ./shared
RUN pnpm install --frozen-lockfile
RUN pnpm --filter sale-dashboard-shared run build
RUN pnpm --filter sale-dashboard-backend run build

FROM base AS runtime
WORKDIR /app/backend
ENV NODE_ENV=production
COPY --from=build /app/backend/package.json ./package.json
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY backend/src/data/mocks/files ./dist/data/mocks/files
EXPOSE 4000
CMD ["node", "dist/server.js"]
