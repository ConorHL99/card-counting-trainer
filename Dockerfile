# syntax=docker/dockerfile:1
#
# Production image for deployment behind nginx-proxy-manager on
# TrueNAS (see DEPLOYMENT.md). Local dev never uses this file — it
# runs `npm run dev` directly against docker-compose.yml's Postgres.

# -----------------------------------------------------------------------
# 1) deps — install ALL dependencies, including dev ones (tsc, eslint,
#    tailwind, drizzle-kit). Only used by the build stage below; none of
#    this reaches the final image.
# -----------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# -----------------------------------------------------------------------
# 2) builder — compiles the app with `next build`.
#
#    DATABASE_URL note: `next build` imports the root layout (and
#    everything it transitively imports — NavHeader -> src/auth.ts ->
#    src/lib/db/index.ts) while collecting page data for every route,
#    even fully-dynamic ones that never run at build time otherwise.
#    src/lib/db/index.ts throws immediately if DATABASE_URL is unset, so
#    the build needs *some* value present. This placeholder is never
#    used to actually reach a database (no query runs during the
#    build) and has zero effect on the real container's runtime
#    DATABASE_URL, which comes from docker-compose's `.env` file at
#    container start, not from anything baked in here.
# -----------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgres://build:build@localhost:5432/build_placeholder"
RUN npm run build

# -----------------------------------------------------------------------
# 3) runner — minimal production image. `output: "standalone"`
#    (next.config.ts) traces exactly the production node_modules the
#    server actually needs into .next/standalone, so this stage only
#    ever copies that pruned output plus static assets and the SQL
#    migration files — never the full node_modules, dev dependencies,
#    or unbuilt source.
# -----------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Migration inputs: the plain SQL files drizzle-kit already generated
# (committed to the repo) plus the small runner script that applies
# them — see scripts/migrate.mjs and docker-entrypoint.sh.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
# scripts/migrate.mjs runs as a plain Node script, outside Next's own
# bundling — Next inlines drizzle-orm/postgres directly into its
# compiled server chunks (verified: the app itself runs fine without
# them present as separate packages), but a script Next never bundled
# needs them for real. Both have zero dependencies of their own
# (verified against their package.json), so copying just these two
# directories from the `deps` stage is sufficient — no wider
# node_modules merge needed. See DEPLOYMENT.md.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
