# Supabase CLI credentials — secrets injected via op run
# References the Development/go-recorder-prod 1Password item.
# Usage: op run --env-file=.env.supabase-cli.tpl -- npx supabase <command>

SUPABASE_ACCESS_TOKEN=op://Development/go-recorder-prod/SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD=op://Development/go-recorder-prod/SUPABASE_DB_PASSWORD
