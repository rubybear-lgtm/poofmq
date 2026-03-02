#!/usr/bin/env bash
set -e

# When DB_URL is set, verify we can reach Postgres before migrating.
# Pre-deploy runs in a separate container; if this fails, the real error is printed below.
if [ -n "${DB_URL:-}" ]; then
  if echo "$DB_URL" | grep -q '^\${{'; then
    echo "Warning: DB_URL looks unresolved (still contains \${{...}}). Pre-deploy may not receive resolved variables."
  fi
  echo "Checking database connection..."
  for i in 1 2 3; do
    if php artisan db:show --database=pgsql >/dev/null 2>&1; then
      echo "Database is reachable."
      break
    fi
    if [ "$i" -eq 3 ]; then
      echo "Database connection failed. Full error:"
      php artisan db:show --database=pgsql 2>&1 || true
      exit 1
    fi
    sleep 2
  done
fi

php artisan migrate --force
