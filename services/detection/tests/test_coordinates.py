"""Boards with printed coordinate labels in the margins.

Margin text adds gradient energy near the outer grid lines; it must not
create phantom lines, shift the detected board size, or read as stones.
"""

from __future__ import annotations

import pytest

from app.detection import detect_board
from tests.fixtures import (
    CURVE_MILD,
    LIGHT_THEME,
    WOOD_THEME,
    curve_page,
    render_board,
)
from tests.test_detection import CORNERS


def _stone_set(result):
    return {(stone.x, stone.y, stone.color) for stone in result.setupStones}


@pytest.mark.parametrize("theme", [WOOD_THEME, LIGHT_THEME])
@pytest.mark.parametrize("size", [9, 13, 19])
def test_board_with_coordinate_labels(size, theme):
    # Corner and edge stones sit closest to the margin labels.
    stones = [
        (0, 0, "B"),
        (size - 1, 0, "W"),
        (0, size - 1, "W"),
        (size - 1, size - 1, "B"),
        (size // 2, 0, "B"),
        (0, size // 2, "W"),
        (size // 2, size // 2, "B"),
    ]
    image = render_board(size, stones=stones, theme=theme, coordinates=True)
    result = detect_board(image, CORNERS)

    assert result.boardSize == size
    assert result.positionView is None
    assert _stone_set(result) == set(stones)


@pytest.mark.parametrize("theme", [WOOD_THEME, LIGHT_THEME])
def test_empty_board_with_coordinate_labels_has_no_false_stones(theme):
    image = render_board(19, stones=[], theme=theme, coordinates=True)
    result = detect_board(image, CORNERS)

    assert result.boardSize == 19
    assert result.positionView is None
    assert result.setupStones == []


def test_curved_annotated_book_diagram_with_coordinates():
    stones = [
        (3, 3, "B"),
        (15, 3, "W"),
        (9, 9, "W"),
        (3, 15, "W"),
        (15, 15, "B"),
        (0, 9, "B"),
        (18, 9, "W"),
    ]
    annotations = [
        (3, 3, "1"),
        (15, 3, "16"),
        (9, 9, "88"),
        (3, 15, "A"),
        (15, 15, "X"),
        (0, 9, "B"),
        (18, 9, "O"),
    ]
    image = curve_page(
        render_board(
            19,
            stones=stones,
            theme=LIGHT_THEME,
            annotations=annotations,
            coordinates=True,
        ),
        CURVE_MILD,
    )
    result = detect_board(image, CORNERS)

    assert result.boardSize == 19
    assert result.positionView is None
    assert _stone_set(result) == set(stones)
