"""Annotated (book/kifu-style) boards: printed labels are noise, not output."""

from __future__ import annotations

import pytest

from app.detection import detect_board
from tests.fixtures import DARK_THEME, LIGHT_THEME, WOOD_THEME, render_board
from tests.test_detection import CORNERS

LABELS = ["1", "16", "88", "A", "B", "C", "X", "O"]


def _stone_set(result):
    return {(stone.x, stone.y, stone.color) for stone in result.setupStones}


def _labeled_stones():
    stones = [
        (0, 0, "B"),
        (18, 0, "W"),
        (3, 3, "B"),
        (15, 3, "W"),
        (9, 9, "B"),
        (9, 15, "W"),
        (0, 18, "W"),
        (18, 18, "B"),
    ]
    annotations = [
        (column, row, text) for (column, row, _), text in zip(stones, LABELS)
    ]
    return stones, annotations


@pytest.mark.parametrize("theme", [WOOD_THEME, LIGHT_THEME])
def test_annotated_board_ignores_labels(theme):
    stones, annotations = _labeled_stones()
    image = render_board(19, stones=stones, theme=theme, annotations=annotations)
    result = detect_board(image, CORNERS)

    assert result.boardSize == 19
    assert result.positionView is None
    assert _stone_set(result) == set(stones)


@pytest.mark.parametrize("theme", [WOOD_THEME, LIGHT_THEME, DARK_THEME])
def test_bold_annotations_do_not_flip_white_stones(theme):
    stones = [
        (3, 3, "W"),
        (15, 3, "W"),
        (9, 9, "W"),
        (3, 15, "B"),
        (15, 15, "B"),
    ]
    annotations = [
        (3, 3, "88"),
        (15, 3, "16"),
        (9, 9, "88"),
        (3, 15, "16"),
        (15, 15, "88"),
    ]
    # Thickness 3 drags the centre median of a labelled white stone past the
    # black threshold on the light theme; only annulus sampling keeps it white.
    image = render_board(
        19,
        stones=stones,
        theme=theme,
        annotations=annotations,
        annotation_thickness=3,
    )
    result = detect_board(image, CORNERS)

    assert result.boardSize == 19
    assert _stone_set(result) == set(stones)


@pytest.mark.parametrize("theme", [WOOD_THEME, LIGHT_THEME])
def test_dense_annotated_fight_cluster(theme):
    positions = [
        (9, 9),
        (9, 10),
        (10, 9),
        (10, 10),
        (8, 9),
        (8, 10),
        (9, 8),
        (10, 8),
        (11, 9),
        (11, 10),
        (8, 8),
        (9, 11),
    ]
    stones = [
        (column, row, "B" if index % 2 == 0 else "W")
        for index, (column, row) in enumerate(positions)
    ]
    annotations = [
        (column, row, str(index + 1))
        for index, (column, row) in enumerate(positions)
    ]
    image = render_board(
        19,
        stones=stones,
        theme=theme,
        annotations=annotations,
        annotation_thickness=2,
    )
    result = detect_board(image, CORNERS)

    assert result.boardSize == 19
    assert _stone_set(result) == set(stones)


@pytest.mark.parametrize("theme", [WOOD_THEME, LIGHT_THEME])
def test_annotation_marks_on_empty_points_no_false_positives(theme):
    stones = [(3, 3, "B"), (15, 15, "W")]
    annotations = [(9, 9, "X"), (5, 10, "88"), (12, 4, "A")]
    image = render_board(19, stones=stones, theme=theme, annotations=annotations)
    result = detect_board(image, CORNERS)

    assert result.boardSize == 19
    assert _stone_set(result) == set(stones)


def test_partial_annotated_crop():
    sides = {"left": False, "right": True, "top": False, "bottom": True}
    stones = [(0, 0, "B"), (7, 7, "W"), (3, 3, "W")]
    annotations = [(0, 0, "1"), (7, 7, "2"), (3, 3, "A"), (5, 2, "X")]
    image = render_board(8, stones=stones, real_sides=sides, annotations=annotations)
    result = detect_board(image, CORNERS)

    assert result.boardSize == 9
    assert result.positionView is not None
    assert result.positionView.anchor == "bottom-right"
    assert result.positionView.rows == 8
    assert result.positionView.columns == 8
    # Visible (0,0) maps to full-board (1,1); the empty "X" mark stays empty.
    assert _stone_set(result) == {(1, 1, "B"), (8, 8, "W"), (4, 4, "W")}
