#!/usr/bin/env bash
# Seeds POST /v1/admin/shop-items from scripts/seed-shop-items.json
# Requires: ADMIN_TOKEN, optional API_BASE (default http://localhost:8080)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE="${API_BASE:-http://localhost:8080}"
SEED="$ROOT/scripts/seed-shop-items.json"

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  echo "Set ADMIN_TOKEN (X-Admin-Token)." >&2
  exit 1
fi

if [[ ! -f "$SEED" ]]; then
  echo "Missing $SEED" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required." >&2
  exit 1
fi

count="$(jq 'length' "$SEED")"
echo "Seeding $count shop items → $API_BASE/v1/admin/shop-items"

jq -c '.[]' "$SEED" | while IFS= read -r item; do
  code="$(jq -r '.code' <<<"$item")"
  status="$(curl -sS -o /tmp/shop-seed-body -w '%{http_code}' \
    -X POST "$API_BASE/v1/admin/shop-items" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "X-Admin-Token: $ADMIN_TOKEN" \
    -d "$item")"
  echo "$code → HTTP $status"
  if [[ "$status" != "200" && "$status" != "201" && "$status" != "204" ]]; then
    cat /tmp/shop-seed-body >&2 || true
    echo >&2
  fi
done
