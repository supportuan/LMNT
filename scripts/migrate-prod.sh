#!/bin/sh
set -eu

echo "=== LMNT migrate ==="
echo "RDS_HOST=${RDS_HOST:-MISSING}"
echo "POSTGRES_USER=${POSTGRES_USER:-postgres}"
echo "POSTGRES_DB=${POSTGRES_DB:-postgres}"

if [ -z "${RDS_HOST:-}" ]; then
  echo "ERROR: RDS_HOST is not set. Add it to .env in the project root."
  exit 1
fi

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "ERROR: POSTGRES_PASSWORD is not set. Add it to .env in the project root."
  exit 1
fi

node scripts/check-rds.mjs

echo "Running drizzle-kit migrate ..."
if ! npx drizzle-kit migrate; then
  echo "ERROR: drizzle-kit migrate failed (see output above)"
  exit 1
fi

echo "Migrations complete."
