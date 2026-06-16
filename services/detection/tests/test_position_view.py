"""Partial-board position-view inference."""

from __future__ import annotations

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
