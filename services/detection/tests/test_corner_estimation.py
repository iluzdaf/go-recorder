"""Automatic corner estimation from uploaded images."""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.corner_estimation import estimate_corners
from app.detection import detect_board
from app.main import app
from tests.fixtures import board_corners, render_board, render_tilted_capture

client = TestClient(app)
DATA = Path(__file__).parent / "data"


def _assert_close(estimated, expected, tolerance=8.0):
    for point, (ex, ey) in zip(estimated, expected):
        assert abs(point[0] - ex) <= tolerance
        assert abs(point[1] - ey) <= tolerance


def test_estimates_corners_of_full_frame_board():
    image = render_board(19, stones=[(3, 3, "B"), (15, 15, "W")])
    estimated = estimate_corners(image)

    assert estimated is not None
    expected = [(c["x"], c["y"]) for c in board_corners()]
    _assert_close(estimated, expected)


def test_estimates_corners_of_board_on_background():
    # A board photographed with surroundings: paste the render onto a dark
    # canvas; the contour stage should find it before grid refinement.
    board_png = render_board(19, stones=[(9, 9, "B")], img_size=600)
    board = cv2.imdecode(np.frombuffer(board_png, np.uint8), cv2.IMREAD_COLOR)
    canvas = np.full((800, 800, 3), 40, dtype=np.uint8)
    canvas[100:700, 120:720] = board
    ok, buffer = cv2.imencode(".png", canvas)
    assert ok

    estimated = estimate_corners(buffer.tobytes())

    # Estimated corners may land on the outer grid intersections or on the
    # physical board edge (margin included); both are valid detection inputs.
    # The contract is that detection succeeds from them unchanged.
    assert estimated is not None
    result = detect_board(buffer.tobytes(), estimated)
    assert result.boardSize == 19
    assert result.positionView is None
    assert {(s.x, s.y, s.color) for s in result.setupStones} == {(9, 9, "B")}


def test_estimates_corners_of_partial_crop():
    sides = {"left": False, "right": True, "top": False, "bottom": True}
    image = render_board(8, stones=[(0, 0, "B")], real_sides=sides, rows=5)
    estimated = estimate_corners(image)

    assert estimated is not None
    expected = [(c["x"], c["y"]) for c in board_corners(real_sides=sides)]
    _assert_close(estimated, expected)


def test_estimates_corners_of_tilted_capture():
    stones = [(3, 3, "B"), (15, 15, "W"), (9, 9, "B")]
    image, _ = render_tilted_capture(19, stones, tilt_deg=30)
    estimated = estimate_corners(image)

    assert estimated is not None
    result = detect_board(image, estimated)
    assert result.boardSize == 19
    assert result.positionView is None
    assert {(s.x, s.y, s.color) for s in result.setupStones} == set(stones)


def test_estimates_corners_of_real_app_capture():
    raw = (DATA / "app-tilted-board.jpeg").read_bytes()
    estimated = estimate_corners(raw)

    assert estimated is not None
    _assert_close(
        estimated,
        [(15, 89), (1086, 89), (1086, 746), (15, 746)],
        tolerance=12.0,
    )


def test_returns_none_without_a_grid():
    flat = np.full((300, 300, 3), 150, dtype=np.uint8)
    ok, buffer = cv2.imencode(".png", flat)
    assert ok
    assert estimate_corners(buffer.tobytes()) is None


def test_detect_corners_endpoint():
    image = render_board(19, stones=[])
    response = client.post(
        "/detect-corners", files={"image": ("board.png", image, "image/png")}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["corners"] is not None
    assert len(body["corners"]) == 4
    margin = int(720 * 0.06)
    assert abs(body["corners"][0]["x"] - margin) <= 8


def test_detect_corners_endpoint_returns_null_without_a_grid():
    flat = np.full((300, 300, 3), 150, dtype=np.uint8)
    ok, buffer = cv2.imencode(".png", flat)
    assert ok
    response = client.post(
        "/detect-corners",
        files={"image": ("flat.png", buffer.tobytes(), "image/png")},
    )

    assert response.status_code == 200
    assert response.json()["corners"] is None


def test_detect_corners_endpoint_rejects_empty_image():
    response = client.post(
        "/detect-corners", files={"image": ("empty.png", b"", "image/png")}
    )
    assert response.status_code == 400
