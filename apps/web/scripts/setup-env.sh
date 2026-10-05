#!/usr/bin/env bash
# Punchcard web/API: push secrets to Vercel, write apps/web/.env.local, run migrations.
# Run from Git Bash at the repo root:  bash apps/web/scripts/setup-env.sh
# Reads (never prints) from G:\Vibe Engineering Apps\.secrets\:
#   punchcard-database-url.txt          pooled Neon URL          punchcard-database-direct-url.txt  (migrations)
#   punchcard-better-auth-secret.txt    punchcard-cron-secret.txt    punchcard-revenuecat-webhook-secret.txt
set -euo pipefail
export PATH="/c/tools/node24:$PATH"
cd "$(dirname "$0")/../../.."   # repo root (Vercel project is linked here; root directory = apps/web)

SECRETS="/g/Vibe Engineering Apps/.secrets"
PROD_URL="https://getpunchcard.vercel.app"
read_secret() { tr -d '\r\n' < "$1"; }
set_env() { # name value [--sensitive]
  local name="$1" value="$2" flag="${3:-}"
  for target in production preview development; do
    local ok=0
    for attempt in 1 2 3 4; do
      if printf '%s' "$value" | vercel env add "$name" "$target" --force $flag >/dev/null 2>&1; then ok=1; break; fi
      sleep $((5 * attempt))
    done
    [ "$ok" = 1 ] || { echo "FAILED: vercel env add $name $target"; exit 1; }
  done
  echo "  set $name"
}

echo "Collecting values..."
DB_URL=$(read_secret "$SECRETS/punchcard-database-url.txt")
case "$DB_URL" in postgres*) ;; *) echo "punchcard-database-url.txt must hold a postgres:// connection string"; exit 1;; esac
DIRECT_URL="$DB_URL"; [ -s "$SECRETS/punchcard-database-direct-url.txt" ] && DIRECT_URL=$(read_secret "$SECRETS/punchcard-database-direct-url.txt")
AUTH_SECRET=$(read_secret "$SECRETS/punchcard-better-auth-secret.txt")
CRON=$(read_secret "$SECRETS/punchcard-cron-secret.txt")
RC_WEBHOOK=$(read_secret "$SECRETS/punchcard-revenuecat-webhook-secret.txt")

echo "Pushing to Vercel (production, preview, development)..."
set_env DATABASE_URL "$DB_URL" --sensitive
set_env BETTER_AUTH_SECRET "$AUTH_SECRET" --sensitive
set_env CRON_SECRET "$CRON" --sensitive
set_env REVENUECAT_WEBHOOK_SECRET "$RC_WEBHOOK" --sensitive
set_env NEXT_PUBLIC_APP_URL "$PROD_URL"
set_env BETTER_AUTH_URL "$PROD_URL"

echo "Writing apps/web/.env.local..."
cat > apps/web/.env.local <<ENV
NEXT_PUBLIC_APP_URL=http://localhost:3600
NEXT_PUBLIC_APP_NAME=Punchcard
DATABASE_URL=$DB_URL
BETTER_AUTH_SECRET=$AUTH_SECRET
BETTER_AUTH_URL=http://localhost:3600
CRON_SECRET=$CRON
REVENUECAT_WEBHOOK_SECRET=$RC_WEBHOOK
ENV

echo "Running database migrations (direct URL)..."
(cd apps/web && DATABASE_URL="$DIRECT_URL" pnpm db:migrate)
echo "Done."
