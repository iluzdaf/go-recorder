"""Corners placed exactly on the board's outer grid intersections.

Users mark the corners of the grid itself, so the padded warp must retain
context just outside the quad (bowed line bulges) while rejecting page content
farther out (captions, coordinate labels) as grid lines.
"""

from __future__ import annotations

import json

import pytest

from app.detection import detect_board, parse_corners
from tests.fixtures import (
    CURVE_MEDIUM,
    CURVE_MILD,
    LIGHT_THEME,
    WOOD_THEME,
    board_corners,
    curve_page,
    render_board,
)


def _corners(**kwargs):
    return parse_corners(json.dumps(board_corners(**kwargs)))


def _stone_set(result):
    return {(stone.x, stone.y, stone.color) for stone in result.setupStones}


@pytest.mark.parametrize("theme", [WOOD_THEME, LIGHT_THEME])
@pytest.mark.parametrize("size", [9, 13, 19])
def test_full_board_with_exact_corners(size, theme):
    stones = [
        (0, 0, "B"),
        (size - 1, 0, "W"),
        (0, size - 1, "W"),
        (size - 1, size - 1, "B"),
        (size // 2, 0, "B"),
        (size // 2, size // 2, "W"),
    ]
    image = render_board(size, stones=stones, theme=theme)
    result = detect_board(image, _corners())

    assert result.boardSize == size
    assert result.positionView is None
    assert _stone_set(result) == set(stones)


def test_exact_corners_with_page_content_around_the_grid():
    # Coordinates and a caption sit outside the quad; the padded warp sees
    # them, but they must not read as grid lines or stones.
    stones = [(3, 3, "B"), (15, 15, "W"), (9, 0, "B"), (0, 9, "W")]
    image = render_board(
        19, stones=stones, coordinates=True, caption="Dia. 1"
    )
    result = detect_board(image, _corners())

    assert result.boardSize == 19
    assert result.positionView is None
    assert _stone_set(result) == set(stones)


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
        # A photo of the bottom-right of a board, corners on the visible grid.
        (_sides(right=True, bottom=True), 8, 5, 9, "bottom-right", (1, 4)),
        (_sides(left=True, top=True), 8, 8, 9, "top-left", (0, 0)),
        (_sides(left=True, right=True, top=True), 9, 6, 9, "top", (0, 0)),
        (_sides(), 7, 7, 9, "center", (1, 1)),
    ],
)
def test_partial_crop_with_exact_corners_keeps_anchor(
    sides, columns, rows, board_size, anchor, start
):
    stones = [(0, 0, "B"), (columns - 1, rows - 1, "W")]
    image = render_board(columns, stones=stones, real_sides=sides, rows=rows)
    result = detect_board(image, _corners(real_sides=sides))

    assert result.boardSize == board_size
    view = result.positionView
    assert view is not None
    assert view.anchor == anchor
    assert view.rows == rows
    assert view.columns == columns

    start_x, start_y = start
    assert _stone_set(result) == {
        (start_x, start_y, "B"),
        (start_x + columns - 1, start_y + rows - 1, "W"),
    }


@pytest.mark.parametrize("amplitude", [CURVE_MILD, CURVE_MEDIUM])
def test_curved_page_with_exact_corners(amplitude):
    # The bow pushes the bottom line's bulge outside the straight quad edge;
    # the padded warp must retain it.
    stones = [
        (0, 0, "B"),
        (18, 0, "W"),
        (0, 18, "W"),
        (18, 18, "B"),
        (9, 0, "B"),
        (9, 18, "W"),
        (9, 9, "B"),
    ]
    image = curve_page(render_board(19, stones=stones), amplitude)
    result = detect_board(image, _corners(bow_amplitude=amplitude))

    assert result.boardSize == 19
    assert result.positionView is None
    assert _stone_set(result) == set(stones)


@pytest.mark.parametrize("amplitude", [CURVE_MILD, CURVE_MEDIUM])
def test_curved_annotated_book_diagram_with_exact_corners(amplitude):
    stones = [
        (3, 3, "B"),
        (15, 3, "W"),
        (9, 9, "W"),
        (3, 15, "W"),
        (15, 15, "B"),
        (9, 18, "W"),
    ]
    annotations = [
        (3, 3, "1"),
        (15, 3, "16"),
        (9, 9, "88"),
        (3, 15, "A"),
        (15, 15, "X"),
        (9, 18, "O"),
    ]
    image = curve_page(
        render_board(
            19,
            stones=stones,
            theme=LIGHT_THEME,
            annotations=annotations,
            coordinates=True,
            caption="Dia. 1",
        ),
        amplitude,
    )
    result = detect_board(image, _corners(bow_amplitude=amplitude))

    assert result.boardSize == 19
    assert result.positionView is None
    assert _stone_set(result) == set(stones)
