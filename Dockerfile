FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# next build imports the DB module; compose injects the real URL at runtime
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV SESSION_SECRET=build-placeholder-not-used-at-runtime-xxxx
RUN mkdir -p public && npm run build

FROM node:22-alpine AS migrate
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db ./src/db
CMD ["npx", "drizzle-kit", "migrate"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
