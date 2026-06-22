# Prod dev environment — secrets injected via op run
# All values reference the Development/go-recorder-prod 1Password item.
# Run: pnpm dev:prod

NEXT_PUBLIC_SUPABASE_URL=op://Development/go-recorder-prod/NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=op://Development/go-recorder-prod/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=op://Development/go-recorder-prod/SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DETECTION_SERVICE_URL=https://go-board-detection-795978602142.asia-southeast1.run.app
DETECTION_API_KEY=op://Development/go-recorder-prod/DETECTION_API_KEY
