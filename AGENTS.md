# go-recorder

## Commands

- pnpm dev
- pnpm typecheck
- pnpm lint
- pnpm test

## Architecture

- Drafts and games are local-only unless explicitly shared.
- /games/[slug] is for recording games.
- /drafts/[slug] is for board editing.
- /shares/[slug] is immutable and forkable.
- Editing a share opens a draft, not the game recorder.
- Upload SGF preserves move order and variations.
- Upload image creates setup stones, not move history.

## Technical rules

- Use strict TypeScript.
- Prefer minimal diffs.
- Avoid introducing dependencies unless necessary.
- Run lint/typecheck/tests before completion.

## Supabase

- Never modify hosted Supabase directly.
- All schema changes must be migrations.
- Do not run `supabase db push` unless explicitly asked.
