#!/bin/sh
# Runs on every container start: apply any pending migrations, then
# start the server. migrate.mjs only ever adds new migrations (it's
# idempotent — already-applied ones are skipped via drizzle's own
# __drizzle_migrations tracking table), so this is safe to run on
# every restart, not just the first deploy. If this step ever needs
# to be run by hand instead, see DEPLOYMENT.md.
set -e

echo "==> Applying database migrations..."
node scripts/migrate.mjs

echo "==> Starting server..."
exec node server.js
