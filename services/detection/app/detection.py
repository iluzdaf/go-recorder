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

WARP_SIZE = 1280
EDGE_INSET_FRAC = 0.03
PEAK_HEIGHT_FRAC = 0.25
PEAK_MIN_DISTANCE_FRAC = 0.02
INTERIOR_RADIUS_FRAC = 0.26
BACKGROUND_RADIUS_FRAC = 0.12
FILL_DARK_DELTA = 50.0
FILL_LIGHT_DELTA = 40.0
RING_DARK_DELTA = 30.0
RING_COVERAGE_THRESHOLD = 0.42
RING_SAMPLES = 36
RING_BAND_FRACS = (0.30, 0.34, 0.38, 0.42, 0.46)

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
            raw_x, raw_y = point["x"], point["y"]
        elif isinstance(point, (list, tuple)) and len(point) == 2:
            raw_x, raw_y = point[0], point[1]
        else:
            raise DetectionError("each corner must provide x and y")

        try:
            points.append((float(raw_x), float(raw_y)))
        except (TypeError, ValueError):
            raise DetectionError("corner coordinates must be numbers")
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
    # Downscaling a high-resolution photo with linear interpolation blurs thin
    # stone outlines away; area interpolation preserves them.
    interpolation = (
        cv2.INTER_AREA
        if max(image.shape[:2]) > WARP_SIZE
        else cv2.INTER_LINEAR
    )
    return cv2.warpPerspective(
        image, matrix, (WARP_SIZE, WARP_SIZE), flags=interpolation
    )


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


def _local_background(
    gray: np.ndarray,
    xs: list[int],
    ys: list[int],
    i: int,
    j: int,
    radius: int,
) -> float | None:
    """Board brightness around an intersection, sampled at the centres of the
    adjacent (diagonal) cells. Cell centres never sit on a grid line or a stone,
    so the estimate stays clean at edges and corners and adapts to local
    lighting and board colour (light, dark, or wood)."""

    samples: list[float] = []
    for di in (-1, 1):
        for dj in (-1, 1):
            ni, nj = i + di, j + dj
            if 0 <= ni < len(xs) and 0 <= nj < len(ys):
                cx = (xs[i] + xs[ni]) // 2
                cy = (ys[j] + ys[nj]) // 2
                samples.append(_patch_median(gray, cx, cy, radius))
    return float(np.median(samples)) if samples else None


def _ring_coverage(
    gray: np.ndarray, cx: int, cy: int, cell: float, dark_below: float
) -> float:
    """Fraction of directions around the intersection whose boundary band holds
    a dark pixel. A stone outline yields a near-closed dark ring; an empty
    intersection only crosses the thin grid lines along a few directions. The
    radial band tolerates stones whose outline radius varies slightly."""

    height, width = gray.shape
    band = [cell * fraction for fraction in RING_BAND_FRACS]
    dark = 0
    for k in range(RING_SAMPLES):
        angle = 2.0 * np.pi * k / RING_SAMPLES
        cos_a = np.cos(angle)
        sin_a = np.sin(angle)
        for radius in band:
            px = int(round(cx + radius * cos_a))
            py = int(round(cy + radius * sin_a))
            if 0 <= px < width and 0 <= py < height and gray[py, px] < dark_below:
                dark += 1
                break
    return dark / RING_SAMPLES


def _detect_stones(
    gray: np.ndarray,
    xs: list[int],
    ys: list[int],
    start_x: int,
    start_y: int,
) -> tuple[list[SetupStone], float]:
    cell = _cell_size(xs, ys)
    interior_radius = max(2, int(cell * INTERIOR_RADIUS_FRAC))
    background_radius = max(2, int(cell * BACKGROUND_RADIUS_FRAC))

    fallback_background = float(np.median(gray))

    stones: list[SetupStone] = []
    confidences: list[float] = []
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            interior = _patch_median(gray, x, y, interior_radius)
            background = _local_background(gray, xs, ys, i, j, background_radius)
            if background is None:
                background = fallback_background

            diff = interior - background
            if diff < -FILL_DARK_DELTA:
                # A solid dark fill: a black stone (any board), or a white stone
                # on a dark board is handled by the bright branch below.
                stones.append(SetupStone(x=start_x + i, y=start_y + j, color="B"))
                confidences.append(min(1.0, -diff / (2.0 * FILL_DARK_DELTA)))
            elif diff > FILL_LIGHT_DELTA:
                # A solid bright fill: a white stone on a wood or dark board.
                stones.append(SetupStone(x=start_x + i, y=start_y + j, color="W"))
                confidences.append(min(1.0, diff / (2.0 * FILL_LIGHT_DELTA)))
            else:
                # Fill matches the board (e.g. an outlined white stone on a
                # light board): look for the stone's dark outline ring.
                coverage = _ring_coverage(
                    gray, x, y, cell, background - RING_DARK_DELTA
                )
                if coverage > RING_COVERAGE_THRESHOLD:
                    # A board-coloured fill ringed by a dark outline is a white
                    # stone. Black stones are solid and already caught above, so
                    # we do not second-guess the colour here (a white stone's
                    # subtle interior shading must not be read as black).
                    stones.append(
                        SetupStone(x=start_x + i, y=start_y + j, color="W")
                    )
                    confidences.append(coverage)
                else:
                    confidences.append(1.0 - coverage)

    confidence = float(np.mean(confidences)) if confidences else 0.0
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
