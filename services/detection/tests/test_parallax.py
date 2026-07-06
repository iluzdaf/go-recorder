"""Stones shifted off their intersections by perspective parallax.

A tilted camera shifts stone tops away from the grid by a roughly uniform
offset. White stones on wood clear the brightness threshold by little enough
that off-centre sampling misses them first.
"""

from __future__ import annotations

import json

import pytest

from app.detection import detect_board, parse_corners
from tests.fixtures import render_board, render_cropped_capture
from tests.test_detection import CORNERS


def _stone_set(result):
    return {(stone.x, stone.y, stone.color) for stone in result.setupStones}


@pytest.mark.parametrize(
    "offset",
    [(0.15, 0.15), (0.25, 0.25), (0.2, -0.15), (-0.25, 0.1)],
)
def test_parallax_shifted_stones_on_wood(offset):
    stones = [
        (3, 3, "B"),
        (15, 3, "W"),
        (9, 9, "W"),
        (3, 15, "W"),
        (15, 15, "B"),
        (9, 15, "W"),
    ]
    image = render_board(19, stones=stones, stone_offset=offset)
    result = detect_board(image, CORNERS)

    assert result.boardSize == 19
    assert result.positionView is None
    assert _stone_set(result) == set(stones)


def test_non_uniform_parallax_from_off_axis_camera():
    # An off-axis camera shifts far-side stones more than near-side ones; the
    # visible symptom is a slanted image border in the overlay. The global
    # offset alone leaves far-edge stones off-centre; bounded refinement
    # around it recovers them.
    stones = [
        (2, 2, "B"),
        (16, 2, "W"),
        (9, 4, "W"),
        (3, 9, "W"),
        (16, 9, "W"),
        (9, 9, "B"),
        (2, 16, "W"),
        (16, 16, "W"),
        (10, 15, "B"),
    ]
    image = render_board(
        19, stones=stones, stone_offset_gradient=(0.5, 0.35)
    )
    result = detect_board(image, CORNERS)

    assert result.boardSize == 19
    assert result.positionView is None
    assert _stone_set(result) == set(stones)


def test_parallax_camera_crop_with_exact_corners():
    # The real-photo scenario: a tilted capture of the bottom-right of a
    # 19x19 board, corners on the visible grid, stone tops shifted.
    visible = [
        (0, 2, "B"),
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
    stones = [(column + 11, row + 14, color) for column, row, color in visible]
    image, corners = render_cropped_capture(
        19, stones, col_start=11, col_end=18, row_start=14, row_end=18,
        stone_offset=(0.15, 0.15),
    )
    result = detect_board(image, parse_corners(json.dumps(corners)))

    assert result.boardSize == 9
    view = result.positionView
    assert view is not None
    assert view.anchor == "bottom-right"
    assert view.rows == 5
    assert view.columns == 8
    assert _stone_set(result) == {
        (column + 1, row + 4, color) for column, row, color in visible
    }
