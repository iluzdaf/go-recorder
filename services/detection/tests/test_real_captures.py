"""Real captures checked in as regression assets under tests/data/."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
import pytest

from app.corner_estimation import estimate_corners
from app.detection import detect_board, parse_corners

DATA = Path(__file__).parent / "data"


def _stone_set(result):
    return {(stone.x, stone.y, stone.color) for stone in result.setupStones}


def test_app_tilted_board_capture():
    # Screenshot of a 3D board-rendering app: pale wood, soft-shaded white
    # stones barely brighter than the board, stone tops shifted off their
    # intersections by the render's perspective. Corners marked exactly on
    # the outer visible grid intersections (8 columns x 5 rows).
    raw = (DATA / "app-tilted-board.jpeg").read_bytes()
    corners = parse_corners(
        json.dumps(
            [
                {"x": 15, "y": 89},
                {"x": 1086, "y": 89},
                {"x": 1086, "y": 746},
                {"x": 15, "y": 746},
            ]
        )
    )
    result = detect_board(raw, corners)

    assert result.boardSize == 9
    view = result.positionView
    assert view is not None
    assert view.anchor == "bottom-right"
    assert view.rows == 5
    assert view.columns == 8

    visible = [
        (1, 2, "B"),
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
    # 8x5 visible, anchored bottom-right on a 9 board: offset (1, 4).
    assert _stone_set(result) == {
        (column + 1, row + 4, color) for column, row, color in visible
    }


def test_app_tilted_board_anchor_from_estimated_corners():
    # The app flow: corners auto-estimated, then detection — the anchor must
    # still come out bottom-right with the same stones as the hand-marked
    # corners, including blacks sitting on the cut edges.
    raw = (DATA / "app-tilted-board.jpeg").read_bytes()
    corners = estimate_corners(raw)
    assert corners is not None

    result = detect_board(
        raw, parse_corners(json.dumps([{"x": x, "y": y} for x, y in corners]))
    )

    assert result.boardSize == 9
    view = result.positionView
    assert view is not None
    assert view.anchor == "bottom-right"
    assert view.rows == 5
    assert view.columns == 8

    visible = [
        (1, 2, "B"),
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
    assert _stone_set(result) == {
        (column + 1, row + 4, color) for column, row, color in visible
    }


@pytest.mark.parametrize(
    "scale,quality", [(1.0, 70), (1.0, 50), (0.7, 90), (0.5, 90)]
)
def test_app_tilted_board_survives_picker_transcodes(scale, quality):
    # Phone photo pickers re-encode uploads (and sometimes downscale). JPEG
    # ringing beside line endings and blur at the image boundary must not
    # flip the anchor — this capture came back bottom-left on device.
    raw = (DATA / "app-tilted-board.jpeg").read_bytes()
    image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if scale != 1.0:
        image = cv2.resize(
            image,
            (int(image.shape[1] * scale), int(image.shape[0] * scale)),
            interpolation=cv2.INTER_AREA,
        )
    ok, buffer = cv2.imencode(
        ".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality]
    )
    assert ok
    transcoded = buffer.tobytes()

    corners = estimate_corners(transcoded)
    assert corners is not None
    result = detect_board(
        transcoded,
        parse_corners(json.dumps([{"x": x, "y": y} for x, y in corners])),
    )

    view = result.positionView
    assert view is not None
    assert view.anchor == "bottom-right"
    assert view.rows == 5
    assert view.columns == 8


def test_dark_mode_full_board_from_estimated_corners():
    # The app's own dark-mode screenshot: bright grid lines on a dark board,
    # coordinate labels on all four sides, dense high-contrast stone
    # clusters. Stone edges used to flood the line detector with clutter
    # peaks (26 rows detected, hundreds of phantom whites); the periodic
    # chain keeps only the lattice, and bright-line boards disable the
    # dark-line occlusion and annulus shortcuts.
    raw = (DATA / "full-19x19-board.jpeg").read_bytes()
    corners = estimate_corners(raw)
    assert corners is not None

    result = detect_board(
        raw, parse_corners(json.dumps([{"x": x, "y": y} for x, y in corners]))
    )

    assert result.boardSize == 19
    assert result.positionView is None
    blacks = sum(1 for stone in result.setupStones if stone.color == "B")
    whites = sum(1 for stone in result.setupStones if stone.color == "W")
    # The position holds roughly two dozen stones of each colour; the failure
    # mode this guards against produced hundreds of whites.
    assert 15 <= blacks <= 30
    assert 20 <= whites <= 40
    assert result.confidence > 0.9


def test_book_page_registration_from_estimated_corners():
    # A phone photo of a book page: faint printed grid sharing the frame with
    # a title and paragraphs. Text used to contaminate the grid search; the
    # periodicity localization isolates the board, and chain extension
    # recovers the faintly printed outer lines. Outlined whites are beyond
    # the classical branches on mid-tone paper; the learned classifier
    # supplies them (verified ground truth in book-flat-board.json).
    raw = (DATA / "book-flat-board.jpeg").read_bytes()
    corners = estimate_corners(raw)
    assert corners is not None
    expected = [(138, 643), (2099, 643), (2099, 2635), (138, 2635)]
    for (x, y), (ex, ey) in zip(corners, expected):
        assert abs(x - ex) <= 30
        assert abs(y - ey) <= 30

    result = detect_board(
        raw, parse_corners(json.dumps([{"x": x, "y": y} for x, y in corners]))
    )

    assert result.boardSize == 19
    assert result.positionView is None
    assert result.confidence > 0.9
    sidecar = json.loads((DATA / "book-flat-board.json").read_text())
    assert {(stone.x, stone.y, stone.color) for stone in result.setupStones} == {
        (int(key.split(",")[0]), int(key.split(",")[1]), color)
        for key, color in sidecar["stones"].items()
    }


def test_top_left_diagram_anchor():
    # A top-left corner diagram (columns A-K, rows 19-15) with coordinate
    # labels on all four sides. The row-number labels sit flush against the
    # left edge and the bottom letter row aligns with the columns; both used
    # to fake grid lines or continuations, anchoring the view to center.
    # Cut sides are recognised by their thin line stubs; label glyphs are
    # thick and vote neither way.
    raw = (DATA / "top-left-partial-board.jpeg").read_bytes()
    corners = estimate_corners(raw)
    assert corners is not None

    result = detect_board(
        raw, parse_corners(json.dumps([{"x": x, "y": y} for x, y in corners]))
    )

    view = result.positionView
    assert view is not None
    assert view.anchor == "top-left"
    assert view.rows == 5
    assert view.columns == 10
    # Board size is the smallest standard size that fits the visible grid;
    # only the printed labels say 19, which geometry alone cannot know.
    assert result.boardSize == 13
    # Spot-check stones against the printed diagram (visible coordinates
    # equal full-board coordinates for a top-left anchor).
    stones = _stone_set(result)
    assert (2, 0, "B") in stones  # C19
    assert (3, 0, "W") in stones  # D19
    assert (0, 1, "B") in stones  # A18
    assert (0, 2, "W") in stones  # A17


def test_flat_photo_partial_board_no_ring_false_whites():
    # A near-top-down phone photo of a wooden board, corners auto-detected.
    # The board's own crossing grid lines used to fake outline rings at empty
    # intersections (mostly along the frame edges), inventing white stones and
    # dragging confidence down. Gating the ring branch to light boards removes
    # them; the remaining detections are all solid, hence high confidence.
    raw = (DATA / "flat-photo-partial-board.jpeg").read_bytes()
    corners = estimate_corners(raw)
    assert corners is not None

    result = detect_board(
        raw, parse_corners(json.dumps([{"x": x, "y": y} for x, y in corners]))
    )

    assert result.boardSize == 19
    view = result.positionView
    assert view is not None
    assert view.anchor == "bottom-right"
    assert view.rows == 16 and view.columns == 10
    # Before the fix: ~16 whites (half false) at confidence 0.75.
    whites = sum(1 for stone in result.setupStones if stone.color == "W")
    assert whites <= 8
    assert result.confidence > 0.9
