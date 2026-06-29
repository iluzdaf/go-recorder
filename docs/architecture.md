# Architecture

## Stack

- Next.js 16.
- React 19.
- Strict TypeScript.
- Tailwind CSS.
- Vitest.
- Supabase.
- `@sabaki/shudan`.
- `@sabaki/go-board`.

## Routes

- `/`
  - Creates local games from setup details.
  - Creates blank board drafts.
- `/games`
  - Redirects to `/`.
- `/games/[slug]`
  - Records a local game.
- `/drafts/[slug]`
  - Edits a local board position or variation draft.
- `/shares/[slug]`
  - Displays an immutable shared position.
- `/api/shares`
  - Creates shares.
- `/api/shares/[slug]`
  - Looks up shares.
- `/api/detect-board`
  - Proxies board-image detection to the external detection service.
  - Reads `DETECTION_SERVICE_URL` and forwards the shared secret `DETECTION_API_KEY` as an `X-API-Key` header.
  - Both env vars are server-side only and never sent to the browser.
- `/shares/[slug]/opengraph-image`
  - Renders share previews.
- `/changelog`
  - Displays release notes.
- `/privacy`
  - Displays the in-app privacy policy and share-retention notice.

## Data Model

- `components/types.ts`
  - Contains core shared types.
- `LocalGameRecord`
  - Represents a game being recorded in browser storage.
- `LocalDraftRecord`
  - Represents a board position or variation being edited in browser storage.
  - Uses `draftKind` with `"board"` or `"variation"`.
  - Can include `parentShareSlug`, `baseMoveCount`, and `positionView`.
- `LocalEditableRecord`
  - Union of local games and local drafts.
- `ShareRecord`
  - Immutable Supabase record.
  - Created server-side via the service role.

## Local Recording

- `app/page.tsx`
  - Starts local game and draft creation.
- `lib/localGameSetup.ts`
  - Handles initial game configuration.
- `lib/localGames.ts`
  - Handles browser-local CRUD.
  - Uses the `go-recorder:local-game:` storage key prefix.
- `lib/localGameView.ts`
  - Creates loaded local game view state.
- `lib/localEditableSave.ts`
  - Saves local editable records.
- `app/games/[slug]/page.tsx`
  - Loads the local game recording route.
- `components/GoBoard.tsx`
  - Orchestrates game recording UI.
- `components/RecorderActionBar.tsx`
  - Provides recorder board controls.

## Draft Editing

- `components/DraftGoBoard.tsx`
  - Orchestrates draft board and variation editing UI.
- `components/DraftBoardLoader.tsx`
  - Loads draft route state.
- `components/DraftBoardActionBar.tsx`
  - Provides draft controls.
- `lib/boardDraft.ts`
  - Contains board-position draft state helpers.
- `lib/variationDraft.ts`
  - Contains variation editing behavior on top of a base game.

## Draft From Image

- `components/ImageDraftCreator.tsx`
  - Overlay flow: upload an image, mark the four board corners, detect, and open the resulting draft.
- `lib/imageCorners.ts`
  - Corner-handle geometry and display-to-natural-pixel scaling.
- `lib/detectBoardClient.ts`
  - Posts the image and corners to `/api/detect-board`.
- `lib/boardDetection.ts`
  - Detection result type and runtime validator.
- `lib/boardDetectionDraft.ts`
  - Converts a detection result into a normal board draft input.
- The detection service itself lives in `services/detection/` (separate backend boundary).

## Share Viewing

- `components/ShareGoBoard.tsx`
  - Orchestrates immutable share viewing UI.
- `components/ShareBoardLoader.tsx`
  - Loads share route state.
- `components/ShareBoardActionBar.tsx`
  - Provides share viewer controls.
- `components/ShareMenu.tsx`
  - Displays share creation and share-link controls.
- `lib/shareClient.ts`
  - Converts a local record to share input.
  - Posts to `/api/shares`.
- `lib/shareMenu.ts`
  - Contains share menu helper logic.
- `lib/sharePresentation.ts`
  - Contains share titles and descriptions.
- `lib/shareBoardView.ts`
  - Contains share board view helpers.
- `lib/shareBoardState.ts`
  - Contains share board state helpers.
- `lib/shareFinalPosition.ts`
  - Derives the final position saved with each share.
- `lib/shareFork.ts`
  - Forks a share into a new draft.
- `lib/shareValidation.ts`
  - Validates incoming share payloads on the server.
- `lib/shareView.ts`
  - Contains share page rendering helpers.

## Core Go Logic

- `lib/gameLogic.ts`
  - Handles board size, handicap setup, and `GameState` validation.
- `lib/gameReplay.ts`
  - Replays moves and computes board positions.
- `lib/gameEdits.ts`
  - Applies corrections to recorded moves.
- `lib/gameCorrectionUi.ts`
  - Contains placement zoom and stone-correction UI math.
  - Covered by `tests/gameCorrectionUi.test.ts`.

## Board Geometry And Controls

- `lib/boardGeometry.ts`
  - Contains board coordinate and geometry math.
- `components/useBoardGeometry.ts`
  - Measures live board geometry.
- `lib/actionBarDrag.ts`
  - Contains action bar drag math.
- `components/useActionBarDrag.ts`
  - Handles action bar drag behavior.
- Shared board UI should be deduped when recorder, draft, and share views differ only by small behavior flags.

## Styling

- `app/goban-overrides.css`
  - Contains Shudan and goban theme overrides.
- `app/shares/[slug]/opengraph-image.tsx`
  - Must stay visually aligned with live share captions and final-position behavior.

## Board Detection Service

- `services/detection/`
  - Standalone FastAPI + OpenCV service, deployed separately on Cloud Run.
  - A new backend boundary; not part of the Next.js app or Supabase.
  - Stateless: uploaded images are processed in memory and never stored or logged.
- Contract:
  - `POST /detect` accepts `multipart/form-data` with an `image` file and a `corners` JSON field (4 points, TL/TR/BR/BL).
  - Returns `boardSize` (auto-detected 9/13/19), `setupStones`, optional `positionView`, and `confidence`.
  - Response field names mirror `components/types.ts` so the result maps onto a board draft.
  - `GET /health` for readiness probes.
- The Next.js app reaches the service through a server-side proxy route (added with the draft-from-image frontend).
- See `docs/detection-service.md` for the full contract, auth, detection approach, and deploy.

## Copy And Changelog

- `lib/messages/en.json`
  - Contains user-facing UI strings.
- `content/changelog/en.json`
  - Contains user-facing release notes.
- Copy changes should usually update both files when behavior changes are user-facing.
