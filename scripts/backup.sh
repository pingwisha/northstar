#!/usr/bin/env bash
# Saves a copy of the live database to backups/ (one SQL file per run). The files hold people's data:
# keep them private, they are kept out of git.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
mkdir -p backups
out="backups/northstar-$(date +%Y-%m-%d-%H%M).sql"
cd app
npx wrangler d1 export northstar --remote --output "../$out"
echo "Saved: $out"
