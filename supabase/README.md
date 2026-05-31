# Local Supabase

This project uses local Supabase for development and migration verification before any hosted database changes.

## Requirements

- Supabase CLI, available with `npx supabase`
- Docker-compatible runtime available on `PATH`

## Commands

```bash
npx supabase start
npx supabase status
npx supabase stop
```

Use the values from `npx supabase status` in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Do not run `supabase db push` against hosted Supabase unless explicitly requested.

## Switching Between Local And Prod

This repo includes two env snapshots:

- `.env.app.local`
- `.env.app.prod`

Switch with:

```bash
pnpm env:local
pnpm env:prod
```

Restart `pnpm dev`, `npm run build`, or `npm start` after switching.

## Migrations

- `20260528020000_create_legacy_games.sql` mirrors the legacy hosted `games` table shape used before game recording moved to browser-local storage.
- `20260528030000_create_shares.sql` creates immutable public share records. Shares are publicly readable, but inserts stay server-side through the service role.
