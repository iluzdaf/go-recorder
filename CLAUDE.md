# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

Go Recorder is a Next.js 16 / React 19 app for recording and sharing Go (Baduk) games and board positions. Games and drafts are browser-local unless explicitly shared; public shares are immutable records stored in Supabase.

## Commands

```bash
pnpm dev          # start dev server (webpack mode)
pnpm build        # production build (webpack mode)
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint
pnpm test         # Vitest (all tests)
pnpm test -- tests/gameLogic.test.ts   # run a single test file
pnpm env:local    # copy .env.app.local → .env.local
pnpm env:prod     # copy .env.app.prod → .env.local
```

`pnpm lint` can hang locally — if it does, rely on `pnpm typecheck`, `pnpm test`, and `git diff --check` instead.

## Routes

| Route | Purpose |
|---|---|
| `/` | Create local games or blank board drafts |
| `/games` | Redirects to `/` |
| `/games/[slug]` | Record a game |
| `/drafts/[slug]` | Edit a board position (draft) |
| `/shares/[slug]` | View an immutable shared position |
| `/shares/[slug]/opengraph-image` | OG image for share previews |
| `/api/shares` | Create a share (POST) |
| `/api/shares/[slug]` | Look up a share (GET) |
| `/changelog` | Release notes |

## Architecture

### Data model

All core types live in [`components/types.ts`](components/types.ts). Key distinctions:

- **`LocalGameRecord`** — a game being recorded in the browser (localStorage).
- **`LocalDraftRecord`** — a board position being edited in the browser; has `draftKind` (`"board"` | `"variation"`), optional `parentShareSlug`, `baseMoveCount`, and `positionView`.
- **`LocalEditableRecord`** — union of the two above.
- **`ShareRecord`** — immutable Supabase row, created server-side via the service role.

### Core Go logic

| File | Responsibility |
|---|---|
| `lib/gameLogic.ts` | Board size, handicap setup, `GameState` validation |
| `lib/gameReplay.ts` | Step through moves, compute board positions |
| `lib/gameEdits.ts` | Applying corrections to recorded moves |
| `lib/variationDraft.ts` | Variation editing on top of a base game |
| `lib/gameCorrectionUi.ts` | Placement-zoom and stone-correction UI math |
| `lib/boardDraft.ts` | Board-position draft state |
| `lib/boardGeometry.ts` | Board coordinate and geometry math |

### Local storage

`lib/localGames.ts` — CRUD for `LocalGameRecord` and `LocalDraftRecord` in `localStorage` (key prefix `go-recorder:local-game:`). `lib/localGameSetup.ts` handles initial game configuration. `lib/localGameView.ts` and `lib/localEditableSave.ts` manage view state and saving edits.

### Sharing

`lib/shareClient.ts` — converts a local record to a `CreateShareInput` and POSTs to `/api/shares`.  
`lib/shareMenu.ts` / `components/ShareMenu.tsx` — share menu open/close state and auto-create logic.  
`lib/sharePresentation.ts` — title/description strings for share cards.  
`lib/shareBoardView.ts` / `lib/shareBoardState.ts` — view and state for the share board page.  
`lib/shareFinalPosition.ts` — derives the `FinalPosition` grid saved with each share.  
`lib/shareFork.ts` — forking a share into a new draft.  
`lib/shareValidation.ts` — validates incoming share payloads on the server.  
`lib/shareView.ts` — share page rendering helpers.

### Component groupings

**Recording path:** `app/page.tsx` → `components/GoBoard.tsx` + `components/RecorderActionBar.tsx`  
**Draft editing:** `components/DraftGoBoard.tsx`, `DraftBoardLoader.tsx`, `DraftBoardActionBar.tsx`  
**Share viewing:** `components/ShareGoBoard.tsx`, `ShareBoardLoader.tsx`, `ShareBoardActionBar.tsx`, `ShareMenu.tsx`  
**Shared UI utilities:** `lib/actionBarDrag.ts` + `components/useActionBarDrag.ts`, `lib/boardGeometry.ts` + `components/useBoardGeometry.ts`

`app/goban-overrides.css` contains all Shudan/goban theme overrides.  
`app/shares/[slug]/opengraph-image.tsx` must stay visually aligned with live share captions and final-position display.

### Supabase

- All schema changes go in `supabase/migrations/` — never edit hosted Supabase directly.
- Do not run `supabase db push` unless explicitly asked.
- Shares are publicly readable; inserts must remain server-side (service role).
- For production data questions, run read-only/dry-run queries first and confirm before any destructive operation.
- See `supabase/README.md` for local dev setup.

### i18n and copy

User-facing strings: `lib/messages/en.json`  
Changelog entries: `content/changelog/en.json`  
Copy changes should usually update both.

## Workflow rules

- Do not attempt visual testing locally.
- Prefer minimal, focused diffs.
- Avoid new dependencies unless necessary.
- Use strict TypeScript; keep helper input types as narrow as practical.
- For branch-based work: switch to `main`, pull latest, then create a feature branch before editing.
- If asked to commit, push, or open a PR, continue through that publish step.
- Do not reset, checkout, or revert unrelated files in the worktree.
- Run `pnpm typecheck` and focused `pnpm test -- <test-file>` before completing non-trivial changes.
