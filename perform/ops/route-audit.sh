#!/bin/bash
# Server-side route audit — capture HTTP code, TTFB, size, title
# Usage: ./route-audit.sh [BASE_URL]
set -e
BASE="${1:-https://perform.foai.cloud}"

# Static pages + representative dynamic routes
ROUTES=(
  "/" "/access" "/analysts" "/audition/voice" "/cards"
  "/dashboard" "/data" "/debate" "/draft" "/draft/agent"
  "/draft/board" "/draft/mock" "/draft/simulate" "/draft/war-room"
  "/film" "/flag-football" "/franchise" "/franchise/roster"
  "/franchise/staff" "/grading" "/huddle" "/huddle/workspace"
  "/login" "/players" "/players/cards" "/players/college"
  "/podcast" "/podcast/shows" "/podcasters"
  "/podcasters/dashboard" "/podcasters/mlb" "/podcasters/nba"
  "/podcasters/onboarding" "/podcasters/settings"
  "/podcasters/war-room" "/podcasters/workbench"
  "/rankings" "/rankings/QB" "/reveal" "/studio"
  "/studio/around-the-horn" "/teams"
  # dynamic samples
  "/draft/Fernando%20Mendoza"
  "/players/Fernando%20Mendoza"
  # critical APIs (public or auth-gated, both tell us something)
  "/api/health" "/api/players?limit=1" "/api/platform/freshness"
  "/api/draft/team-needs" "/api/podcast/episodes?limit=1"
  "/api/feed" "/api/news"
)

printf "%-5s %-7s %-10s %s\n" "CODE" "TIME" "BYTES" "PATH"
printf "%-5s %-7s %-10s %s\n" "----" "----" "-----" "----"

for path in "${ROUTES[@]}"; do
  OUT=$(curl -sk -o /tmp/audit.body -w "%{http_code}|%{time_total}|%{size_download}" "$BASE$path" --max-time 20 2>&1)
  CODE="${OUT%%|*}"; REST="${OUT#*|}"
  TIME="${REST%%|*}"; BYTES="${REST#*|}"
  printf "%-5s %-7s %-10s %s\n" "$CODE" "$TIME" "$BYTES" "$path"
done
