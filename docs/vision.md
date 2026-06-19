# Vision

## Product

- Go Recorder is a lightweight Go and Baduk board recorder.
- The app should make it fast to record games, correct mistakes, draft board positions, and share immutable board states.
- The primary workflows should work well on touch devices and small screens.
- Games and drafts should stay browser-local unless the user explicitly shares them.
- Shared pages should be stable, readable, and suitable for study, review, and preview links.

## Experience Principles

- Keep the board as large as practical.
- Avoid controls that steal board space during recording.
- Keep repeated actions close to the board.
- Prefer predictable, compact controls over explanatory UI text.
- Keep correction and draft interactions forgiving on touch screens.
- Make share links immutable so viewers can trust that a shared board state will not change.
- Agents should run the app locally and verify smoke tests; use preview deployments for items that require a real device or environment.

## Scope Boundaries

- Browser-local games and drafts are the default persistence model.
- Supabase is used for immutable public shares.
- Hosted Supabase must not be modified directly by agents.
- Public shares are readable without authentication.
- Share inserts must remain server-side through the service role.
- Marketing pages are not a priority unless explicitly requested.
