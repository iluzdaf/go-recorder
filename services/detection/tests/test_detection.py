"""Stone and board-size detection on synthetic full boards."""

from __future__ import annotations

import numpy as np
import pytest

from app.detection import _snap_to_lattice, detect_board, parse_corners
from tests.fixtures import full_corners, render_board

CORNERS = parse_corners(
    '[{"x":0,"y":0},{"x":719,"y":0},{"x":719,"y":719},{"x":0,"y":719}]'
)


def _stone_set(result):
    return {(stone.x, stone.y, stone.color) for stone in result.setupStones}


@pytest.mark.parametrize("size", [9, 13, 19])
def test_detects_board_size_for_empty_board(size):
    image = render_board(size, stones=[])
    result = detect_board(image, CORNERS)

    assert result.boardSize == size
    assert result.setupStones == []
    assert result.positionView is None


@pytest.mark.parametrize("size", [9, 13, 19])
def test_detects_stones_with_correct_colors(size):
    stones = [
        (2, 2, "B"),
        (size - 3, 2, "W"),
        (size // 2, size // 2, "B"),
        (2, size - 3, "W"),
    ]
    image = render_board(size, stones=stones)
    result = detect_board(image, CORNERS)

    assert result.boardSize == size
    assert _stone_set(result) == set(stones)
    assert result.positionView is None
    assert result.confidence > 0.5


def test_detects_stones_on_board_edges():
    size = 19
    stones = [(0, 0, "B"), (size - 1, 0, "W"), (0, size - 1, "W"), (size - 1, size - 1, "B")]
    image = render_board(size, stones=stones)
    result = detect_board(image, CORNERS)

    assert result.boardSize == size
    assert _stone_set(result) == set(stones)


def test_corners_helper_matches_image_size():
    assert full_corners(720)[2] == {"x": 719, "y": 719}


def test_snap_to_lattice_corrects_a_stone_edge_outlier():
    # A clean 75-pitch lattice with two lines grossly displaced (stone edges
    # picked over masked grid lines, ~0.5 pitch off, the real failure mode).
    clean = [4 + i * 75 for i in range(19)]
    drifted = list(clean)
    drifted[3] -= 40
    drifted[4] -= 44

    snapped = _snap_to_lattice(drifted)

    assert snapped[3] == pytest.approx(clean[3], abs=2)
    assert snapped[4] == pytest.approx(clean[4], abs=2)
    # Untouched lines stay put.
    for index in (0, 1, 2, 10, 18):
        assert snapped[index] == pytest.approx(clean[index], abs=2)


def test_snap_to_lattice_preserves_a_bowed_page():
    # A bowed page: gentle sinusoidal deviation within the keep tolerance.
    base = [72 + i * 63 for i in range(19)]
    bowed = [int(b + 8 * np.sin(np.pi * i / 18)) for i, b in enumerate(base)]

    assert _snap_to_lattice(bowed) == bowed
