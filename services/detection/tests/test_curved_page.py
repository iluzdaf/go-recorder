"""Curved book-page boards: mild sinusoidal bowing must not break detection."""

from __future__ import annotations

import pytest

from app.detection import detect_board
from tests.fixtures import (
    CURVE_MEDIUM,
    CURVE_MILD,
    LIGHT_THEME,
    curve_page,
    render_board,
)
from tests.test_detection import CORNERS


def _stone_set(result):
    return {(stone.x, stone.y, stone.color) for stone in result.setupStones}


@pytest.mark.parametrize("amplitude", [CURVE_MILD, CURVE_MEDIUM])
def test_curved_wood_board(amplitude):
    # Corners and edge midpoints are the worst case for line/stone mismatch.
    stones = [
        (0, 0, "B"),
        (18, 0, "W"),
        (0, 18, "W"),
        (18, 18, "B"),
        (9, 0, "B"),
        (0, 9, "W"),
        (18, 9, "B"),
        (9, 18, "W"),
        (9, 9, "B"),
        (3, 15, "W"),
    ]
    image = curve_page(render_board(19, stones=stones), amplitude)
    result = detect_board(image, CORNERS)

    assert result.boardSize == 19
    assert result.positionView is None
    assert _stone_set(result) == set(stones)


@pytest.mark.parametrize("amplitude", [CURVE_MILD, CURVE_MEDIUM])
def test_curved_annotated_light_board(amplitude):
    stones = [
        (3, 3, "B"),
        (15, 3, "W"),
        (9, 9, "W"),
        (3, 15, "W"),
        (15, 15, "B"),
        (9, 0, "B"),
        (9, 18, "W"),
    ]
    annotations = [
        (3, 3, "1"),
        (15, 3, "16"),
        (9, 9, "88"),
        (3, 15, "A"),
        (15, 15, "X"),
        (9, 0, "B"),
        (9, 18, "O"),
    ]
    image = curve_page(
        render_board(19, stones=stones, theme=LIGHT_THEME, annotations=annotations),
        amplitude,
    )
    result = detect_board(image, CORNERS)

    assert result.boardSize == 19
    assert result.positionView is None
    assert _stone_set(result) == set(stones)
