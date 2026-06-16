"""OpenCV board-detection pipeline.

Given an uploaded board image and the four board corners (ordered TL, TR, BR,
BL in pixel coordinates), the pipeline perspective-corrects the board, detects
the grid, auto-detects the board size, classifies each intersection as empty,
black, or white, and infers a position view for partial captures.

The service is stateless: image bytes live only for the duration of a request.
"""

from __future__ import annotations

import json
from typing import Sequence

import cv2
import numpy as np

from .board_size import smallest_fitting_size, snap_board_size
from .position_view import infer_position_view
from .schemas import DetectionResult, SetupStone

WARP_SIZE = 720
EDGE_INSET_FRAC = 0.03
PEAK_HEIGHT_FRAC = 0.25
PEAK_MIN_DISTANCE_FRAC = 0.02
PATCH_RADIUS_FRAC = 0.3
DARK_DELTA = 60.0
LIGHT_DELTA = 35.0

Corner = tuple[float, float]


class DetectionError(ValueError):
    """Raised for malformed input or undetectable board geometry."""


def parse_corners(raw: str) -> list[Corner]:
    """Parse the ``corners`` form field into four ``(x, y)`` points."""

    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        raise DetectionError("corners must be valid JSON")

    if not isinstance(data, list) or len(data) != 4:
        raise DetectionError("corners must be a list of 4 points")

    points: list[Corner] = []
    for point in data:
        if isinstance(point, dict) and "x" in point and "y" in point:
            points.append((float(point["x"]), float(point["y"])))
        elif isinstance(point, (list, tuple)) and len(point) == 2:
            points.append((float(point[0]), float(point[1])))
        else:
            raise DetectionError("each corner must provide x and y")
    return points


def _decode(raw: bytes) -> np.ndarray:
    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise DetectionError("Unable to decode image")
    return image


def _warp(image: np.ndarray, corners: Sequence[Corner]) -> np.ndarray:
    source = np.array(corners, dtype=np.float32)
    target = np.array(
        [[0, 0], [WARP_SIZE - 1, 0], [WARP_SIZE - 1, WARP_SIZE - 1], [0, WARP_SIZE - 1]],
        dtype=np.float32,
    )
    matrix = cv2.getPerspectiveTransform(source, target)
    return cv2.warpPerspective(image, matrix, (WARP_SIZE, WARP_SIZE))


def _smooth(profile: np.ndarray, window: int) -> np.ndarray:
    kernel = np.ones(window) / window
    return np.convolve(profile, kernel, mode="same")


def _find_peaks(profile: np.ndarray) -> list[int]:
    length = len(profile)
    if length == 0:
        return []

    height = float(profile.max()) * PEAK_HEIGHT_FRAC
    min_distance = max(3, int(length * PEAK_MIN_DISTANCE_FRAC))

    peaks: list[int] = []
    index = 1
    while index < length - 1:
        value = profile[index]
        if value >= height and value >= profile[index - 1] and value >= profile[index + 1]:
            peaks.append(index)
            index += min_distance
        else:
            index += 1
    return peaks


def _line_positions(gray: np.ndarray, axis: str) -> list[int]:
    if axis == "vertical":
        gradient = np.abs(cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3))
        profile = gradient.sum(axis=0)
    else:
        gradient = np.abs(cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3))
        profile = gradient.sum(axis=1)
    return _find_peaks(_smooth(profile, 5))


def _real_sides(xs: list[int], ys: list[int], size: int) -> dict[str, bool]:
    inset = size * EDGE_INSET_FRAC
    return {
        "left": xs[0] > inset,
        "right": (size - 1 - xs[-1]) > inset,
        "top": ys[0] > inset,
        "bottom": (size - 1 - ys[-1]) > inset,
    }


def _patch_median(gray: np.ndarray, cx: int, cy: int, radius: int) -> float:
    x0 = max(0, cx - radius)
    x1 = min(gray.shape[1], cx + radius + 1)
    y0 = max(0, cy - radius)
    y1 = min(gray.shape[0], cy + radius + 1)
    patch = gray[y0:y1, x0:x1]
    if patch.size == 0:
        return float(gray[cy, cx])
    return float(np.median(patch))


def _cell_size(xs: list[int], ys: list[int]) -> float:
    diffs = list(np.diff(xs)) + list(np.diff(ys))
    return float(np.median(diffs)) if diffs else float(WARP_SIZE)


def _detect_stones(
    gray: np.ndarray,
    xs: list[int],
    ys: list[int],
    start_x: int,
    start_y: int,
) -> tuple[list[SetupStone], float]:
    radius = max(2, int(_cell_size(xs, ys) * PATCH_RADIUS_FRAC))

    background_samples = [
        _patch_median(gray, (xs[i] + xs[i + 1]) // 2, (ys[j] + ys[j + 1]) // 2, radius)
        for j in range(len(ys) - 1)
        for i in range(len(xs) - 1)
    ]
    wood = float(np.median(background_samples)) if background_samples else float(np.median(gray))

    stones: list[SetupStone] = []
    clear = 0
    total = 0
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            total += 1
            value = _patch_median(gray, x, y, radius)
            if value < wood - DARK_DELTA:
                stones.append(SetupStone(x=start_x + i, y=start_y + j, color="B"))
                if value < wood - DARK_DELTA * 1.2:
                    clear += 1
            elif value > wood + LIGHT_DELTA:
                stones.append(SetupStone(x=start_x + i, y=start_y + j, color="W"))
                if value > wood + LIGHT_DELTA * 1.2:
                    clear += 1
            elif abs(value - wood) < LIGHT_DELTA * 0.6:
                clear += 1

    confidence = clear / total if total else 0.0
    return stones, confidence


def detect_board(raw: bytes, corners: Sequence[Corner]) -> DetectionResult:
    """Run the full detection pipeline and return a draft-ready result."""

    if len(corners) != 4:
        raise DetectionError("Exactly 4 corners are required")

    warped = _warp(_decode(raw), corners)
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)

    xs = _line_positions(gray, "vertical")
    ys = _line_positions(gray, "horizontal")
    if len(xs) < 2 or len(ys) < 2:
        raise DetectionError("Could not detect a board grid")

    visible_columns = len(xs)
    visible_rows = len(ys)
    sides = _real_sides(xs, ys, WARP_SIZE)
    largest_visible = max(visible_rows, visible_columns)

    if all(sides.values()):
        board_size, _ = snap_board_size(largest_visible)
    else:
        board_size = smallest_fitting_size(largest_visible)
    if board_size < largest_visible:
        board_size = smallest_fitting_size(largest_visible)

    position_view, start_x, start_y = infer_position_view(
        sides, visible_rows, visible_columns, board_size
    )
    stones, confidence = _detect_stones(gray, xs, ys, start_x, start_y)

    return DetectionResult(
        boardSize=board_size,
        setupStones=stones,
        positionView=position_view,
        confidence=confidence,
    )
