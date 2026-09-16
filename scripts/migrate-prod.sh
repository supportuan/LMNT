#!/bin/sh
set -eu

if [ -z "${RDS_HOST:-}" ]; then
  echo "ERROR: RDS_HOST is not set. Add it to .env on this host."
  exit 1
fi

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "ERROR: POSTGRES_PASSWORD is not set. Add it to .env on this host."
  exit 1
fi

echo "Migrating postgres@${RDS_HOST}:5432/postgres ..."
exec npx drizzle-kit migrate
