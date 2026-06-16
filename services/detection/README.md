# Board Detection Service

- FastAPI + OpenCV service that turns a photo of a Go board into a draft-ready position.
- Stateless: uploaded image bytes live only for the duration of a request and are never stored or logged.
- Auto-detects board size (9x9, 13x13, 19x19); there is no client-provided size hint.

## Contract

- `GET /health`
  - Returns `{ "status": "ok" }` for readiness probes.
- `POST /detect`
  - `multipart/form-data`:
    - `image`: PNG/JPEG file part.
    - `corners`: JSON array of 4 points `[{ "x": number, "y": number }, ...]` in pixel coordinates, ordered top-left, top-right, bottom-right, bottom-left.
  - Response JSON:
    - `boardSize`: `9 | 13 | 19`.
    - `setupStones`: `[{ "x": column, "y": row, "color": "B" | "W" }]`, 0-indexed in full-board coordinates.
    - `positionView`: `{ "anchor", "rows", "columns" } | null` (null for a full board).
    - `confidence`: float in `[0, 1]` describing classification clarity.
  - `400` on malformed input (missing/undecodable image, invalid `corners` JSON, wrong corner count).

## Authentication

- Set `DETECTION_API_KEY` to require a shared secret on `POST /detect`.
  - When set, requests must send a matching `X-API-Key` header or receive `401`.
  - When unset (local development, tests), no authentication is enforced.
- `GET /health` is always open for readiness probes.
- The caller (the Next.js proxy route) holds the key server-side; it never reaches the browser.

## Pipeline

- Perspective-correct the board using the four corners.
- Detect grid lines and auto-detect board size.
- Classify each intersection against a local (per-cell) background: a dark fill is black, a bright fill is white, and a fill that matches the board is checked for a dark outline ring (outlined white stones on light boards / kifu diagrams). This handles wood, light, and dark-mode boards.
- Infer a `positionView` for partial captures from which sides reach a real board edge.

## Local Development

- `python3 -m venv .venv`
- `.venv/bin/python -m pip install -r requirements-dev.txt`
- `.venv/bin/python -m pytest`
  - Runs the full suite against deterministic synthetic board images.
- `.venv/bin/python -m uvicorn app.main:app --reload`
  - Serves on `http://127.0.0.1:8000`.

## Docker

- `docker build -t go-board-detection .`
- `docker run -p 8080:8080 go-board-detection`
  - Serves on `http://127.0.0.1:8080` (binds `$PORT`, default `8080`).

## Deploy To Cloud Run

- Build and deploy from this directory:
  - `gcloud run deploy go-board-detection --source . --region <region> --allow-unauthenticated`
- Or push an image and deploy it:
  - `gcloud builds submit --tag gcr.io/<project>/go-board-detection`
  - `gcloud run deploy go-board-detection --image gcr.io/<project>/go-board-detection --region <region> --allow-unauthenticated`
- The Next.js app reaches this service through a server-side proxy route (added in the frontend PR); the service URL is configured there, not in this service.
- Set the shared secret on the deployed service, e.g.:
  - `gcloud run deploy go-board-detection --source . --region <region> --allow-unauthenticated --set-env-vars DETECTION_API_KEY=<secret>`
  - For stronger handling, store the secret in Secret Manager and reference it with `--set-secrets`.
