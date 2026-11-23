# syntax=docker/dockerfile:1

# Production image for ask-ai-ui. Builds Next.js in standalone mode, so the
# final image holds only the traced server files, not the full node_modules.
#
#   docker build -t ask-ai-ui .
#   docker run -p 3000:3000 -e ASK_AI_API_URL=http://api.example.com ask-ai-ui

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile

FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# public/ is empty and untracked, so it may not exist in a fresh checkout.
RUN mkdir -p public && yarn build

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:${PORT}/ >/dev/null || exit 1

CMD ["node", "server.js"]
