"""Low-contrast and blurred captures of printed pages."""

from __future__ import annotations

import pytest

from app.detection import detect_board
from tests.fixtures import LIGHT_THEME, PALE_THEME, WOOD_THEME, degrade, render_board
from tests.test_detection import CORNERS


def _stone_set(result):
    return {(stone.x, stone.y, stone.color) for stone in result.setupStones}


def test_low_contrast_scanned_page():
    stones = [
        (3, 3, "B"),
        (15, 3, "W"),
        (9, 9, "W"),
        (3, 15, "W"),
        (15, 15, "B"),
    ]
    image = render_board(19, stones=stones, theme=PALE_THEME)
    result = detect_board(image, CORNERS)

    assert result.boardSize == 19
    assert result.positionView is None
    assert _stone_set(result) == set(stones)


@pytest.mark.parametrize("theme", [WOOD_THEME, LIGHT_THEME])
def test_blur_and_downsample(theme):
    stones = [
        (3, 3, "B"),
        (15, 3, "W"),
        (9, 9, "B"),
        (3, 15, "W"),
        (15, 15, "B"),
    ]
    annotations = [
        (3, 3, "1"),
        (15, 3, "16"),
        (9, 9, "88"),
        (3, 15, "A"),
        (15, 15, "X"),
    ]
    image = degrade(render_board(19, stones=stones, theme=theme, annotations=annotations))
    result = detect_board(image, CORNERS)

    assert result.boardSize == 19
    assert result.positionView is None
    assert _stone_set(result) == set(stones)
