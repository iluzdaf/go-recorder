"""Endpoint-level request/response validation for ``POST /detect``."""

from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.main import app
from tests.fixtures import full_corners, render_board

client = TestClient(app)

CORNERS_JSON = json.dumps(full_corners())


def _post(image_bytes: bytes | None, corners: str | None):
    files = {"image": ("board.png", image_bytes, "image/png")} if image_bytes is not None else None
    data = {"corners": corners} if corners is not None else None
    return client.post("/detect", files=files, data=data)


def test_health_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_detect_returns_documented_shape():
    image = render_board(13, stones=[(3, 3, "B"), (9, 9, "W")])
    response = _post(image, CORNERS_JSON)

    assert response.status_code == 200
    body = response.json()
    assert body["boardSize"] == 13
    assert body["positionView"] is None
    assert isinstance(body["confidence"], float)
    stones = {(s["x"], s["y"], s["color"]) for s in body["setupStones"]}
    assert stones == {(3, 3, "B"), (9, 9, "W")}


def test_missing_corners_field_returns_400():
    image = render_board(9, stones=[])
    response = _post(image, None)
    assert response.status_code == 400


def test_missing_image_returns_400():
    response = _post(None, CORNERS_JSON)
    assert response.status_code == 400


def test_invalid_corners_json_returns_400():
    image = render_board(9, stones=[])
    response = _post(image, "not-json")
    assert response.status_code == 400


def test_wrong_corner_count_returns_400():
    image = render_board(9, stones=[])
    response = _post(image, json.dumps([{"x": 0, "y": 0}, {"x": 1, "y": 1}]))
    assert response.status_code == 400


def test_non_numeric_corner_returns_400():
    image = render_board(9, stones=[])
    corners = json.dumps(
        [{"x": "bad", "y": 0}, {"x": 1, "y": 0}, {"x": 1, "y": 1}, {"x": 0, "y": 1}]
    )
    response = _post(image, corners)
    assert response.status_code == 400


def test_empty_image_returns_400():
    response = _post(b"", CORNERS_JSON)
    assert response.status_code == 400


def test_undecodable_image_returns_400():
    response = _post(b"not-an-image", CORNERS_JSON)
    assert response.status_code == 400
