"""Stone detection across board themes (light, dark, outlined white stones)."""

from __future__ import annotations

import pytest

from app.detection import detect_board
from tests.fixtures import DARK_THEME, LIGHT_THEME, render_board
from tests.test_detection import CORNERS


def _stone_set(result):
    return {(stone.x, stone.y, stone.color) for stone in result.setupStones}


@pytest.mark.parametrize("size", [9, 13, 19])
def test_outlined_white_on_light_board(size):
    # White fill equals the board colour; only the dark outline distinguishes it.
    stones = [
        (2, 2, "W"),
        (size - 3, 2, "W"),
        (3, size - 2, "B"),
        (size // 2, size // 2, "W"),
    ]
    image = render_board(size, stones=stones, theme=LIGHT_THEME)
    result = detect_board(image, CORNERS)

    assert result.boardSize == size
    assert _stone_set(result) == set(stones)


def test_dark_mode_board():
    size = 19
    stones = [
        (3, 3, "W"),
        (15, 3, "B"),
        (3, 15, "B"),
        (15, 15, "W"),
        (9, 9, "W"),
    ]
    image = render_board(size, stones=stones, theme=DARK_THEME)
    result = detect_board(image, CORNERS)

    assert result.boardSize == size
    assert _stone_set(result) == set(stones)


def test_empty_light_board_has_no_false_stones():
    image = render_board(19, stones=[], theme=LIGHT_THEME)
    result = detect_board(image, CORNERS)

    assert result.setupStones == []
