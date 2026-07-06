"""Partial-board position-view inference."""

from __future__ import annotations

import pytest

from app.detection import detect_board
from app.position_view import infer_position_view
from tests.fixtures import render_board
from tests.test_detection import CORNERS


def test_full_board_has_no_position_view():
    view, start_x, start_y = infer_position_view(
        {"left": True, "right": True, "top": True, "bottom": True},
        visible_rows=19,
        visible_columns=19,
        board_size=19,
    )
    assert view is None
    assert (start_x, start_y) == (0, 0)


def test_bottom_right_partial_anchor_and_offset():
    view, start_x, start_y = infer_position_view(
        {"left": False, "right": True, "top": False, "bottom": True},
        visible_rows=8,
        visible_columns=8,
        board_size=9,
    )
    assert view is not None
    assert view.anchor == "bottom-right"
    assert view.rows == 8 and view.columns == 8
    # 8 visible on a size-9 board, anchored to the end on both axes.
    assert (start_x, start_y) == (1, 1)


def test_top_band_partial_anchor():
    view, start_x, start_y = infer_position_view(
        {"left": True, "right": True, "top": True, "bottom": False},
        visible_rows=10,
        visible_columns=19,
        board_size=19,
    )
    assert view is not None
    assert view.anchor == "top"
    assert view.rows == 10 and view.columns == 19
    assert (start_x, start_y) == (0, 0)


def test_detects_partial_board_from_image():
    sides = {"left": False, "right": True, "top": False, "bottom": True}
    stones = [(0, 0, "B"), (7, 7, "W")]
    image = render_board(8, stones=stones, real_sides=sides)
    result = detect_board(image, CORNERS)

    assert result.boardSize == 9
    assert result.positionView is not None
    assert result.positionView.anchor == "bottom-right"
    assert result.positionView.rows == 8
    assert result.positionView.columns == 8
    # Visible (0,0) maps to full-board (1,1); visible (7,7) maps to (8,8).
    assert {(stone.x, stone.y, stone.color) for stone in result.setupStones} == {
        (1, 1, "B"),
        (8, 8, "W"),
    }


def _sides(**real: bool) -> dict[str, bool]:
    return {
        "left": real.get("left", False),
        "right": real.get("right", False),
        "top": real.get("top", False),
        "bottom": real.get("bottom", False),
    }


@pytest.mark.parametrize(
    "sides,columns,rows,board_size,anchor,start",
    [
        # Square corner crops of a 9 board.
        (_sides(left=True, top=True), 8, 8, 9, "top-left", (0, 0)),
        (_sides(right=True, top=True), 8, 8, 9, "top-right", (1, 0)),
        (_sides(left=True, bottom=True), 8, 8, 9, "bottom-left", (0, 1)),
        (_sides(right=True, bottom=True), 8, 8, 9, "bottom-right", (1, 1)),
        # Side bands of a 9 board (non-square: rows != columns).
        (_sides(left=True, right=True, top=True), 9, 6, 9, "top", (0, 0)),
        (_sides(left=True, right=True, bottom=True), 9, 6, 9, "bottom", (0, 3)),
        (_sides(top=True, bottom=True, left=True), 6, 9, 9, "left", (0, 0)),
        (_sides(top=True, bottom=True, right=True), 6, 9, 9, "right", (3, 0)),
        # Middle of the board with no real edge in sight.
        (_sides(), 7, 7, 9, "center", (1, 1)),
        # Non-square corner crop.
        (_sides(right=True, bottom=True), 8, 5, 9, "bottom-right", (1, 4)),
        # Larger boards.
        (_sides(right=True, bottom=True), 12, 12, 13, "bottom-right", (1, 1)),
        (_sides(left=True, top=True), 14, 14, 19, "top-left", (0, 0)),
    ],
)
def test_detected_position_view_anchor_rows_and_columns(
    sides, columns, rows, board_size, anchor, start
):
    stones = [(0, 0, "B"), (columns - 1, rows - 1, "W")]
    image = render_board(columns, stones=stones, real_sides=sides, rows=rows)
    result = detect_board(image, CORNERS)

    assert result.boardSize == board_size
    view = result.positionView
    assert view is not None
    assert view.anchor == anchor
    assert view.rows == rows
    assert view.columns == columns

    start_x, start_y = start
    assert {(stone.x, stone.y, stone.color) for stone in result.setupStones} == {
        (start_x, start_y, "B"),
        (start_x + columns - 1, start_y + rows - 1, "W"),
    }
