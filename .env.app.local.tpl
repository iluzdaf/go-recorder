# Local dev environment — secrets injected via op run
# Non-secret values are inlined; secrets reference the Development/go-recorder-local 1Password item.
# Run: pnpm dev:local

# Local Supabase (well-known demo values, same for all local instances)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Detection service
DETECTION_SERVICE_URL=https://go-board-detection-795978602142.asia-southeast1.run.app
DETECTION_API_KEY=op://Development/go-recorder-local/DETECTION_API_KEY
