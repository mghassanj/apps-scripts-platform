#!/bin/bash
# Cron worker script to trigger sync (with retry logic)

set -e

APP_URL="${APP_URL:-https://apps-scripts-platform-production.up.railway.app}"
CRON_SECRET="${CRON_SECRET:-}"
MAX_RETRIES=3
RETRY_DELAY=5

echo "=== Cron Worker Started ==="
echo "Time: $(date)"
echo "Target: $APP_URL/api/cron/sync"
echo ""

for attempt in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $attempt of $MAX_RETRIES..."
  
  response=$(curl -s -w "\n%{http_code}" \
    --max-time 60 \
    -X GET \
    -H "x-cron-secret: $CRON_SECRET" \
    "$APP_URL/api/cron/sync" 2>&1) || true

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  echo "Response code: $http_code"
  echo "Response body: $body"

  if [ "$http_code" = "200" ]; then
    echo ""
    echo "=== Sync completed successfully ==="
    echo "Time: $(date)"
    exit 0
  fi

  if [ "$attempt" -lt "$MAX_RETRIES" ]; then
    echo "Retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  fi
done

echo ""
echo "=== Sync failed after $MAX_RETRIES attempts ==="
echo "Time: $(date)"
exit 1
