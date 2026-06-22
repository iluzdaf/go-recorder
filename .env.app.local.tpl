# Local dev environment — no secrets, all plain values.
# Run: pnpm dev:local
# Requires local Supabase (npx supabase start) and detection service (.venv/bin/python -m uvicorn app.main:app --reload) to be running.

NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DETECTION_SERVICE_URL=http://localhost:8000
