#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() {
  echo "Stopping local services..."
  bash "$REPO_ROOT/scripts/stop-local-services.sh"
}
trap cleanup EXIT

bash "$REPO_ROOT/scripts/start-local-services.sh"

echo "Running E2E tests..."
"$REPO_ROOT/node_modules/.bin/playwright" test "$@"
