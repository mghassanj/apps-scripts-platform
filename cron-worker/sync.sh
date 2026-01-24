#!/bin/bash
# Cron worker script to trigger sync

APP_URL="${APP_URL:-https://apps-scripts-platform-production.up.railway.app}"
CRON_SECRET="${CRON_SECRET:-}"

echo "Starting sync at $(date)"
echo "Target: $APP_URL/api/cron/sync"

response=$(curl -s -w "\n%{http_code}" \
  -X GET \
  -H "x-cron-secret: $CRON_SECRET" \
  "$APP_URL/api/cron/sync")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "Response code: $http_code"
echo "Response body: $body"

if [ "$http_code" -eq 200 ]; then
  echo "Sync completed successfully at $(date)"
  exit 0
else
  echo "Sync failed with code $http_code at $(date)"
  exit 1
fi
