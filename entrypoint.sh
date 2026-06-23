#!/bin/sh
set -e

# Apply any pending schema changes before the app starts.
# Safe to run on every restart — no-op if schema is already in sync.
node_modules/.bin/prisma db push --skip-generate

exec node_modules/.bin/next start
