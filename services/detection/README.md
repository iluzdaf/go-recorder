# Board Detection Service

- FastAPI + OpenCV service that turns a photo of a Go board into a draft-ready position.
- Agent-facing documentation lives in `docs/detection-service.md` (contract, auth, detection approach, limitations, deploy). Keep that file as the source of truth.

## Quickstart

- `python3 -m venv .venv`
- `.venv/bin/python -m pip install -r requirements-dev.txt`
- `.venv/bin/python -m pytest`
- `.venv/bin/python -m uvicorn app.main:app --reload`
