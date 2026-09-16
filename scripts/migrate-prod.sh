#!/bin/sh
set -eu

echo "=== LMNT migrate ==="
node scripts/check-rds.mjs

echo "Running drizzle-kit migrate ..."
if ! npx drizzle-kit migrate; then
  echo "ERROR: drizzle-kit migrate failed (see output above)"
  exit 1
fi

echo "Migrations complete."
