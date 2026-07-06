"""Real captures checked in as regression assets under tests/data/."""

from __future__ import annotations

import json
from pathlib import Path

from app.corner_estimation import estimate_corners
from app.detection import detect_board, parse_corners

DATA = Path(__file__).parent / "data"


def _stone_set(result):
    return {(stone.x, stone.y, stone.color) for stone in result.setupStones}


def test_app_tilted_board_capture():
    # Screenshot of a 3D board-rendering app: pale wood, soft-shaded white
    # stones barely brighter than the board, stone tops shifted off their
    # intersections by the render's perspective. Corners marked exactly on
    # the outer visible grid intersections (8 columns x 5 rows).
    raw = (DATA / "app-tilted-board.jpeg").read_bytes()
    corners = parse_corners(
        json.dumps(
            [
                {"x": 15, "y": 89},
                {"x": 1086, "y": 89},
                {"x": 1086, "y": 746},
                {"x": 15, "y": 746},
            ]
        )
    )
    result = detect_board(raw, corners)

    assert result.boardSize == 9
    view = result.positionView
    assert view is not None
    assert view.anchor == "bottom-right"
    assert view.rows == 5
    assert view.columns == 8

    visible = [
        (1, 2, "B"),
        (3, 2, "B"),
        (4, 2, "B"),
        (5, 1, "B"),
        (6, 1, "B"),
        (7, 1, "B"),
        (5, 2, "W"),
        (6, 2, "W"),
        (4, 3, "W"),
        (6, 4, "W"),
    ]
    # 8x5 visible, anchored bottom-right on a 9 board: offset (1, 4).
    assert _stone_set(result) == {
        (column + 1, row + 4, color) for column, row, color in visible
    }


def test_flat_photo_partial_board_no_ring_false_whites():
    # A near-top-down phone photo of a wooden board, corners auto-detected.
    # The board's own crossing grid lines used to fake outline rings at empty
    # intersections (mostly along the frame edges), inventing white stones and
    # dragging confidence down. Gating the ring branch to light boards removes
    # them; the remaining detections are all solid, hence high confidence.
    raw = (DATA / "flat-photo-partial-board.jpeg").read_bytes()
    corners = estimate_corners(raw)
    assert corners is not None

    result = detect_board(
        raw, parse_corners(json.dumps([{"x": x, "y": y} for x, y in corners]))
    )

    assert result.boardSize == 19
    view = result.positionView
    assert view is not None
    assert view.anchor == "bottom-right"
    assert view.rows == 16 and view.columns == 10
    # Before the fix: ~16 whites (half false) at confidence 0.75.
    whites = sum(1 for stone in result.setupStones if stone.color == "W")
    assert whites <= 8
    assert result.confidence > 0.9
