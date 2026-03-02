#!/usr/bin/env bash
set -e

# When DB_URL is set (e.g. ${{Postgres.DATABASE_URL}}), Railway deploys Postgres first.
# Wait for DB to be reachable so pre-deploy migrate doesn't fail on first or concurrent deploys.
if [ -n "${DB_URL:-}" ]; then
  echo "Waiting for database..."
  max_attempts=90
  for i in $(seq 1 $max_attempts); do
    if php artisan db:show --database=pgsql >/dev/null 2>&1; then
      echo "Database is ready."
      break
    fi
    if [ "$i" -eq $max_attempts ]; then
      echo "Database did not become ready in time (${max_attempts} attempts). Last error:"
      php artisan db:show --database=pgsql 2>&1 || true
      exit 1
    fi
    if [ "$i" -eq 1 ] || [ $((i % 15)) -eq 0 ]; then
      echo "Attempt $i/$max_attempts..."
    fi
    sleep 2
  done
fi

php artisan migrate --force
