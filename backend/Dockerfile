# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS base
WORKDIR /app
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
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/backend/src ./src
COPY --from=build /app/backend/tsconfig.json ./tsconfig.json
COPY --from=build /app/shared ../shared
EXPOSE 4000
CMD ["pnpm", "exec", "tsx", "src/server.ts"]
