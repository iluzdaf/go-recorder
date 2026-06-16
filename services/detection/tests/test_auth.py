"""Shared-secret authentication for ``POST /detect``."""

from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.main import app
from tests.fixtures import full_corners, render_board

client = TestClient(app)

CORNERS_JSON = json.dumps(full_corners())


def _post(corners: str, headers: dict[str, str] | None = None):
    image = render_board(9, stones=[])
    return client.post(
        "/detect",
        files={"image": ("board.png", image, "image/png")},
        data={"corners": corners},
        headers=headers,
    )


def test_no_auth_required_when_key_unset(monkeypatch):
    monkeypatch.delenv("DETECTION_API_KEY", raising=False)
    assert _post(CORNERS_JSON).status_code == 200


def test_missing_key_is_rejected_when_required(monkeypatch):
    monkeypatch.setenv("DETECTION_API_KEY", "secret-token")
    assert _post(CORNERS_JSON).status_code == 401


def test_wrong_key_is_rejected_when_required(monkeypatch):
    monkeypatch.setenv("DETECTION_API_KEY", "secret-token")
    assert _post(CORNERS_JSON, {"X-API-Key": "nope"}).status_code == 401


def test_correct_key_is_accepted_when_required(monkeypatch):
    monkeypatch.setenv("DETECTION_API_KEY", "secret-token")
    assert _post(CORNERS_JSON, {"X-API-Key": "secret-token"}).status_code == 200


def test_health_is_open_without_key(monkeypatch):
    monkeypatch.setenv("DETECTION_API_KEY", "secret-token")
    assert client.get("/health").status_code == 200
