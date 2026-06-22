#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$REPO_ROOT/.local-detection.pid"

# Stop detection service
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping detection service (PID $PID)..."
    kill "$PID"
  else
    echo "Detection service is not running."
  fi
  rm "$PID_FILE"
else
  echo "No detection service PID file found — already stopped?"
fi

# Stop Supabase
echo "Stopping local Supabase..."
cd "$REPO_ROOT"
npx supabase stop

echo "Local services stopped."
