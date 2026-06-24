# Supabase

## Safety Rules

- Never modify hosted Supabase directly via the dashboard or CLI.
- Do not run `supabase db push` manually against hosted Supabase — CI runs it automatically on every merge to `main` via `.github/workflows/supabase-migrate.yml`.
- Put all schema changes under `supabase/migrations/`.
- Use local Supabase for development and migration verification.
- Run read-only or dry-run queries first for production data cleanup questions.
- Ask before destructive production operations.
- Keep public shares readable.
- Keep share inserts server-side through the service role.

## Production Migration CI

- `.github/workflows/supabase-migrate.yml` runs `supabase db push` on every push to `main`.
- Requires three GitHub Actions secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.
  - `SUPABASE_ACCESS_TOKEN`: generate at supabase.com → Account → Access Tokens.
  - `SUPABASE_PROJECT_REF`: the project reference ID from the Supabase dashboard URL.
  - `SUPABASE_DB_PASSWORD`: the database password set when the project was created.
- Migrations must be backward-compatible (additive, nullable, or have a default) to avoid a race with Vercel's independent deploy.

## Local Requirements

- Supabase CLI must be available through `npx supabase`.
- A Docker-compatible runtime must be available on `PATH`.

## Local Commands

- `npx supabase start`
  - Starts local Supabase.
- `npx supabase status`
  - Prints local URLs and keys.
- `npx supabase stop`
  - Stops local Supabase.

## Local Environment

- Use values from `npx supabase status` in `.env.local`.
- Set `NEXT_PUBLIC_SUPABASE_URL` to the local API URL.
- Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the local anon key.
- Set `SUPABASE_SERVICE_ROLE_KEY` to the local service role key.
- Set `NEXT_PUBLIC_SITE_URL` to `http://localhost:3000`.

## Local Environment

- Environment variables are set on Vercel directly for deployed environments.
- For local development, create gitignored `.tpl` files using `op://` references and run via `pnpm dev:local` or `pnpm dev:prod`.
- See `docs/commands.md` for 1Password setup and template structure.

## Migrations

- `20260528020000_create_legacy_games.sql`
  - Mirrors the legacy hosted `games` table shape.
  - Supports history from before game recording moved to browser-local storage.
- `20260528030000_create_shares.sql`
  - Creates immutable public share records.
  - Keeps shares publicly readable.
  - Keeps inserts server-side through the service role.
- `20260624120000_add_share_komi.sql`
  - Adds nullable `komi numeric` column to `shares`.
  - Backward-compatible: existing rows get `null`; old app versions ignore the column.
