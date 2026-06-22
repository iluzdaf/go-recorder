# Prod dev environment — secrets injected via op run
# Public values are inlined; secrets reference the Development/go-recorder-prod 1Password item.
# Run: pnpm dev:prod

# Supabase (public — embedded in client bundle or non-sensitive)
NEXT_PUBLIC_SUPABASE_URL=https://kdzcrtneovamqrzgipvj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_bQ35lxoi09uvnx_VLonb0w_lmA7LpKd
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Secrets
SUPABASE_SERVICE_ROLE_KEY=op://Development/go-recorder-prod/SUPABASE_SERVICE_ROLE_KEY
DETECTION_SERVICE_URL=https://go-board-detection-795978602142.asia-southeast1.run.app
DETECTION_API_KEY=op://Development/go-recorder-prod/DETECTION_API_KEY
