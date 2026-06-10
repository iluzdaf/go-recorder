# go-recorder

## Project State

- Next.js 16 app using React 19, strict TypeScript, Tailwind CSS, Vitest, Supabase, `@sabaki/shudan`, and `@sabaki/go-board`.
- Games and drafts are browser-local unless explicitly shared.
- Public shares are immutable records in Supabase.
- Current app routes:
  - `/` creates local games from setup details and creates blank board drafts.
  - `/games` redirects to `/`.
  - `/games/[slug]` records games.
  - `/drafts/[slug]` edits board positions.
  - `/shares/[slug]` displays immutable shared positions.
  - `/api/shares` and `/api/shares/[slug]` handle share creation and lookup.
  - `/shares/[slug]/opengraph-image` renders share previews.
  - `/changelog` displays release notes.

## Commands

- `pnpm dev` starts Next.js with webpack.
- `pnpm typecheck` runs `tsc --noEmit`.
- `pnpm lint` runs ESLint.
- `pnpm test` runs Vitest.
- `pnpm env:local` copies `.env.app.local` to `.env.local`.
- `pnpm env:prod` copies `.env.app.prod` to `.env.local`.

## Workflow Rules

- Do not try to visually test locally.
- Prefer minimal, focused diffs.
- Avoid introducing dependencies unless necessary.
- Use strict TypeScript and keep helper inputs as narrow as practical.
- For branch-based work, switch to `main`, pull latest remote changes, then create a feature branch before editing.
- If asked to commit, push, or open a PR, continue through that publish step.
- Preserve user changes in the worktree. Do not reset, checkout, or revert unrelated files unless explicitly asked.
- For user-facing copy changes, check `lib/messages/en.json` and usually update `content/changelog/en.json`.

## Verification

- Run relevant checks before completion when practical: `pnpm typecheck`, focused `pnpm test` or `pnpm test -- <test-file>`, and `git diff --check`.
- `pnpm lint` is part of the project commands, but it has been an unreliable local signal in some sessions. If it hangs, report that and rely on typecheck, tests, and diff checks.
- Prefer focused Vitest targets for helper or UI-logic changes, such as tests under `tests/*`.
- Do not block publish-only work on local visual validation.

## Architecture Notes

- `app/page.tsx`, `lib/localGameSetup.ts`, `lib/localGames.ts`, `app/games/[slug]/page.tsx`, and `components/GoBoard.tsx` are the main local recording path.
- `components/DraftGoBoard.tsx`, `components/DraftBoardLoader.tsx`, `components/DraftBoardActionBar.tsx`, and `lib/boardDraft.ts` cover draft editing.
- `components/ShareGoBoard.tsx`, `components/ShareBoardLoader.tsx`, `components/ShareBoardActionBar.tsx`, `components/ShareMenu.tsx`, and `lib/share*.ts` cover share viewing, presentation, and share menu behavior.
- `lib/gameLogic.ts`, `lib/gameReplay.ts`, `lib/gameEdits.ts`, and `lib/variationDraft.ts` contain core Go state, replay, correction, and variation behavior.
- Board geometry and drag behavior are shared through `lib/boardGeometry.ts`, `components/useBoardGeometry.ts`, `lib/actionBarDrag.ts`, and `components/useActionBarDrag.ts`.
- Placement zoom and stone-correction UI math belong in `lib/gameCorrectionUi.ts`, with behavior covered by `tests/gameCorrectionUi.test.ts`.
- Shared board UI should be deduped when recorder/share/draft views differ only by small behavior flags.
- `app/goban-overrides.css` contains Shudan/goban theme overrides.
- `app/shares/[slug]/opengraph-image.tsx` should stay visually aligned with live share captions and final-position behavior.

## Supabase

- Never modify hosted Supabase directly.
- All schema changes must be migrations under `supabase/migrations`.
- Do not run `supabase db push` unless explicitly asked.
- Use local Supabase for development and migration verification. See `supabase/README.md`.
- Shares are publicly readable, but inserts should stay server-side through the service role.
- For production data cleanup questions, do read-only count/dry-run queries first and ask before destructive operations.
