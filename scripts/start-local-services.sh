#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DETECTION_DIR="$REPO_ROOT/services/detection"
PID_FILE="$REPO_ROOT/.local-detection.pid"
LOG_FILE="$REPO_ROOT/.local-detection.log"

# Check Docker is available (required for Supabase)
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Start Docker (or Colima) and retry."
  exit 1
fi

# Check detection service venv exists
if [ ! -f "$DETECTION_DIR/.venv/bin/python" ]; then
  echo "Error: Detection service venv not found."
  echo "Run from services/detection/:"
  echo "  python3 -m venv .venv"
  echo "  .venv/bin/python -m pip install -r requirements-dev.txt"
  exit 1
fi

# Start Supabase
echo "Starting local Supabase..."
cd "$REPO_ROOT"
npx supabase start

# Start detection service in background (no --reload so PID is stable)
echo "Starting detection service..."
"$DETECTION_DIR/.venv/bin/python" -m uvicorn app.main:app \
  --app-dir "$DETECTION_DIR" \
  --host 127.0.0.1 \
  --port 8000 \
  > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

# Health-check detection service (up to 10 seconds)
echo "Waiting for detection service..."
for i in $(seq 1 10); do
  if curl -sf http://127.0.0.1:8000/health > /dev/null 2>&1; then
    echo "Detection service is up."
    break
  fi
  if [ "$i" -eq 10 ]; then
    echo "Error: Detection service did not start in time. Check $LOG_FILE"
    exit 1
  fi
  sleep 1
done

echo ""
echo "Local services are running:"
echo "  Supabase:          http://127.0.0.1:54321"
echo "  Supabase Studio:   http://127.0.0.1:54323"
echo "  Detection service: http://127.0.0.1:8000"
echo ""
echo "Run the app: pnpm dev:local"
echo "Stop services: pnpm services:stop"
