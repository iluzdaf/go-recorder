# Commands

## 1Password Setup (one-time)

- Install the [1Password CLI](https://developer.1password.com/docs/cli/get-started/) and sign in.
- Secrets live in the `Development` vault:
  - `go-recorder-local`: `DETECTION_API_KEY` (local/dev detection key)
  - `go-recorder-prod`: `SUPABASE_SERVICE_ROLE_KEY`, `DETECTION_API_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`
- Field names in 1Password must match the env var names exactly.
- Create local template files (gitignored; not in the repo):
  - `.env.app.local.tpl`:
    ```
    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local anon key from npx supabase status>
    NEXT_PUBLIC_SITE_URL=http://localhost:3000
    DETECTION_SERVICE_URL=https://go-board-detection-795978602142.asia-southeast1.run.app
    DETECTION_API_KEY=op://Development/go-recorder-local/DETECTION_API_KEY
    ```
  - `.env.app.prod.tpl`:
    ```
    NEXT_PUBLIC_SUPABASE_URL=https://kdzcrtneovamqrzgipvj.supabase.co
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_bQ35lxoi09uvnx_VLonb0w_lmA7LpKd
    SUPABASE_SERVICE_ROLE_KEY=op://Development/go-recorder-prod/SUPABASE_SERVICE_ROLE_KEY
    NEXT_PUBLIC_SITE_URL=http://localhost:3000
    DETECTION_SERVICE_URL=https://go-board-detection-795978602142.asia-southeast1.run.app
    DETECTION_API_KEY=op://Development/go-recorder-prod/DETECTION_API_KEY
    ```
  - `.env.supabase-cli.tpl`:
    ```
    SUPABASE_ACCESS_TOKEN=op://Development/go-recorder-prod/SUPABASE_ACCESS_TOKEN
    SUPABASE_DB_PASSWORD=op://Development/go-recorder-prod/SUPABASE_DB_PASSWORD
    ```

## Development

- `pnpm dev:local`
  - Starts Next.js against local Supabase with secrets injected via 1Password CLI.
  - Requires 1Password CLI signed in.
- `pnpm dev:prod`
  - Starts Next.js against hosted Supabase with secrets injected via 1Password CLI.
  - Requires 1Password CLI signed in.
- `pnpm dev`
  - Starts Next.js with webpack (used by Vercel and CI; requires env vars to be set externally).
- `pnpm build`
  - Builds the production app with webpack.

## Verification

- `pnpm typecheck`
  - Runs `tsc --noEmit`.
- `pnpm test`
  - Runs Vitest.
- `pnpm test -- <test-file>`
  - Runs a focused Vitest target.
- `pnpm lint`
  - Runs ESLint.
  - Can be an unreliable local signal in some sessions.
  - If it hangs, report that and rely on `pnpm typecheck`, focused tests, and `git diff --check`.
- `git diff --check`
  - Checks for whitespace errors.

## Supabase CLI (hosted)

- `op run --env-file=.env.supabase-cli.tpl -- npx supabase <command>`
  - Runs any Supabase CLI command with `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` injected from 1Password.
  - Requires 1Password CLI signed in.

## Detection Service (Python)

- Run from `services/detection/`.
- `python3 -m venv .venv`
  - Creates the service virtualenv.
- `.venv/bin/python -m pip install -r requirements-dev.txt`
  - Installs runtime and test dependencies.
- `.venv/bin/python -m pytest`
  - Runs the detection service test suite.
- `.venv/bin/python -m uvicorn app.main:app --reload`
  - Serves the detection service locally.
- See `services/detection/README.md` for the contract and Cloud Run deploy steps.

## Preferred Agent Checks

- Run `pnpm typecheck` for non-trivial TypeScript changes.
- Run focused `pnpm test -- <test-file>` targets for changed logic.
- Run focused ESLint targets for changed TypeScript and TSX files when practical.
- Run `git diff --check` before completing work.
- Do not block publish-only work on local visual validation.
