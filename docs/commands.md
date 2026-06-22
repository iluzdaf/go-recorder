# Commands

## 1Password Setup (one-time)

- Install the [1Password CLI](https://developer.1password.com/docs/cli/get-started/) and sign in.
- Secrets live in the `Development` vault, one item per environment:
  - `go-recorder-local`: `DETECTION_API_KEY` (local/dev detection key)
  - `go-recorder-prod`: `SUPABASE_SERVICE_ROLE_KEY`, `DETECTION_API_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`
- Field names in 1Password must match the env var names exactly.

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
