#!/bin/sh
set -eu

echo "=== LMNT migrate ==="
node scripts/check-rds.mjs
node scripts/run-migrate.mjs
echo "Migrations complete."
