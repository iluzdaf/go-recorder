# Board Detection Service

## Purpose

- Turns a photo or screenshot of a Go board into a draft-ready position.
- Powers the "create draft from image" flow.
- Lives in `services/detection/` as a standalone FastAPI + OpenCV service.

## Boundary

- A separate backend boundary, deployed on Cloud Run; not part of the Next.js app or Supabase.
- Stateless: uploaded image bytes are processed in memory and never stored or logged.
- The Next.js app reaches it only through the server-side proxy route `app/api/detect-board`.

## Contract

- `GET /health`
  - Returns `{ "status": "ok" }` for readiness probes; always open.
- `POST /detect`
  - `multipart/form-data`:
    - `image`: PNG/JPEG file part.
    - `corners`: JSON array of 4 points `[{ "x": number, "y": number }, ...]` in pixel coordinates, ordered top-left, top-right, bottom-right, bottom-left.
  - Response JSON:
    - `boardSize`: `9 | 13 | 19` (auto-detected; no client hint).
    - `setupStones`: `[{ "x": column, "y": row, "color": "B" | "W" }]`, 0-indexed full-board coordinates.
    - `positionView`: `{ "anchor", "rows", "columns" } | null` (null for a full board).
    - `confidence`: float in `[0, 1]`.
  - `400` on malformed input (missing/undecodable image, invalid `corners` JSON, wrong corner count).
- `POST /detect-corners`
  - `multipart/form-data` with an `image` file part only.
  - Response JSON: `corners`: 4 points in pixel coordinates (TL, TR, BR, BL), or `null` when no board grid is found.
  - Suggests where corner handles should start; the user can still adjust. Estimates land on the outer grid intersections, trimming board-surface edges and unsupported line candidates.
  - Same auth as `/detect`; `400` on malformed input.
- Response field names mirror `components/types.ts` so the result maps onto a board draft.

## Authentication

- `DETECTION_API_KEY` enables a shared-secret check on `POST /detect`.
  - When set, requests must send a matching `X-API-Key` header or receive `401`.
  - When unset (local development, tests), no authentication is enforced.
- The proxy route holds the key server-side; it never reaches the browser.

## App Integration

- `app/api/detect-board` proxies uploads to the service.
- Reads `DETECTION_SERVICE_URL` and forwards the secret as `X-API-Key`.
- Both env vars are server-side only; set them in Vercel and in `.env.local`.

## Detection Approach

- Classical OpenCV; no machine learning in v1.
- Perspective-correct the board from the four corners.
  - Corners are meant to sit exactly on the board's outer grid intersections.
  - The quad warps to a padded (inset) target so content just outside it survives: on a bowed book page a grid line can bulge past the straight edge between two exactly-placed corners.
  - Grid-line peaks are only accepted near the quad; page content farther into the pad (captions, coordinate labels) is rejected.
- Detect grid lines from gradient projections; auto-detect board size from the line count.
- Classify each intersection against a local (per-cell) background:
  - A clearly dark fill is black.
  - A clearly bright fill is white.
  - A mildly bright fill whose patch is free of line-dark pixels is a white stone (soft-shaded stones on pale wood; a stone occludes the grid lines, an empty intersection never does).
  - A board-coloured fill ringed by a dark outline is a white stone (outlined white stones on light boards and kifu diagrams). Only applied on a light board: on a mid-tone board the crossing grid lines at an empty intersection would fake a ring. Black stones are solid and caught earlier, so the ring branch always yields white.
  - Stone probes compensate perspective parallax: a global offset estimated from solid-fill evidence, plus a small bounded refinement around it.
- Infer a `positionView` for partial captures from which sides reach a real board edge.
  - A side is cut (board continues out of frame) when most grid lines continue past the outermost perpendicular line into the padded warp; a real edge shows only margin there.
  - This keeps anchors correct whether corners are placed exactly on the board corners or with margin included.
- High-resolution photos are warped at a larger size with area interpolation so thin stone outlines survive downscaling.

## Known Limitations

- Corner precision matters: over-marking by one cell shifts or rescales the grid. The grid uses the detected (possibly non-uniform, perspective-correct) line positions; do not force a uniform lattice, as that misaligns real photos.
- Corners belong on the outer grid intersections; slack up to roughly half the warp pad (about half a cell) is tolerated, but past that, page content can be mistaken for grid lines.
- Page bowing is absorbed up to roughly a third of a cell (single-arch or gutter curl); S-shaped waves tolerate far less. See the measured limits in `services/detection/tests/fixtures.py`.
- Tuned for the common regimes: app screenshots (light and dark mode), straight-on kifu/book diagrams, and wood boards.
- Exotic boards/stones and angled, cluttered photos are the long tail. Reliable coverage there needs a learned approach (a stone detector plus board-corner keypoints), deferred out of v1. The draft is editable, so users correct remaining mistakes by hand.

## Local Development

- Run from `services/detection/`.
- `python3 -m venv .venv`
- `.venv/bin/python -m pip install -r requirements-dev.txt`
- `.venv/bin/python -m pytest`
  - Runs the suite against deterministic synthetic board images.
- `.venv/bin/python -m uvicorn app.main:app --reload`
  - Serves locally; auth is off unless `DETECTION_API_KEY` is set.

## Deploy To Cloud Run

- Build and deploy from `services/detection/`:
  - `gcloud run deploy go-board-detection --source . --region <region> --allow-unauthenticated`
- Set the shared secret on the deployed service:
  - add `--set-env-vars DETECTION_API_KEY=<secret>` (env vars persist across `--source` redeploys).
  - For stronger handling, store the secret in Secret Manager and reference it with `--set-secrets`.
- Existing deployment: project `cogent-silicon-274007`, region `asia-southeast1`.
