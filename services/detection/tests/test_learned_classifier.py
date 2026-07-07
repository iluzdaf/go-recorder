"""Regression tests for the learned classifier inside detect_board.

The corpus sidecars under training/corpus are verified ground truth
(labelled through the app's share flow); these tests pin the integrated
pipeline — classical branches plus the learned model — to exact stone
sets on real photographed book pages from three publishers.
"""

import json
from pathlib import Path

import pytest

from app import stone_classifier
from app.detection import detect_board, parse_corners

CORPUS = Path(__file__).resolve().parent.parent / "training" / "corpus"


def _detect(photo: Path):
    sidecar = json.loads(photo.with_suffix(".json").read_text())
    corners = json.dumps([{"x": x, "y": y} for x, y in sidecar["corners"]])
    return detect_board(photo.read_bytes(), parse_corners(corners)), sidecar


def _visible_stones(result):
    view = result.positionView
    start_x = start_y = 0
    if view is not None:
        anchors = view.anchor.split("-")
        if "right" in anchors:
            start_x = result.boardSize - view.columns
        if "bottom" in anchors:
            start_y = result.boardSize - view.rows
        if view.anchor == "center":
            start_x = (result.boardSize - view.columns) // 2
            start_y = (result.boardSize - view.rows) // 2
    return {
        (stone.x - start_x, stone.y - start_y, stone.color)
        for stone in result.setupStones
    }


@pytest.mark.parametrize(
    "relative",
    [
        "Kiseido/IMG_1664.jpeg",
        "TGA-A/IMG_1668.jpeg",
        "TGA-A/IMG_1669.jpeg",
    ],
)
def test_verified_book_positions_detected_exactly(relative):
    result, sidecar = _detect(CORPUS / relative)
    expected = {
        (int(key.split(",")[0]), int(key.split(",")[1]), color)
        for key, color in sidecar["stones"].items()
    }
    assert _visible_stones(result) == expected


def test_flag_disables_learned_classifier(monkeypatch):
    monkeypatch.setenv("LEARNED_CLASSIFIER", "0")
    assert not stone_classifier.enabled()
    monkeypatch.setenv("LEARNED_CLASSIFIER", "1")
    assert stone_classifier.enabled()
