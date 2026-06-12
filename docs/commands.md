# Commands

## Development

- `pnpm dev`
  - Starts Next.js with webpack.
- `pnpm build`
  - Builds the production app with webpack.
- `pnpm env:local`
  - Copies `.env.app.local` to `.env.local`.
- `pnpm env:prod`
  - Copies `.env.app.prod` to `.env.local`.

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

## Preferred Agent Checks

- Run `pnpm typecheck` for non-trivial TypeScript changes.
- Run focused `pnpm test -- <test-file>` targets for changed logic.
- Run focused ESLint targets for changed TypeScript and TSX files when practical.
- Run `git diff --check` before completing work.
- Do not block publish-only work on local visual validation.
