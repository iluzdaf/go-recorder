"""Real captures checked in as regression assets under tests/data/."""

from __future__ import annotations

import json
from pathlib import Path

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
