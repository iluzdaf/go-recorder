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

# Sized so the corner quad keeps the same resolution it had when it filled a
# 1280px warp, now that the pad consumes 2 x 5% of the frame.
WARP_SIZE = 1440
# The corner quad maps to an inset rectangle rather than the full warp so
# content just outside the quad survives: on a bowed book page a grid line can
# bulge past the straight edge between two exactly-placed corners.
WARP_PAD_FRAC = 0.05
# Grid-line peaks may overflow the quad by up to half the pad (a bowed line's
# bulge); anything farther out is page content such as captions, not the grid.
LINE_OVERFLOW_FRAC = 0.5
# A side is cut (the board continues out of frame) when most grid lines keep
# going past the outermost perpendicular line; a real edge has only margin
# there. Probed just outside the outer line so margin labels and captions
# farther out are not mistaken for continuations.
CONTINUATION_OFFSET_FRACS = (0.12, 0.20, 0.28)
CONTINUATION_DELTA = 30.0
CONTINUATION_THRESHOLD = 0.6
CONTINUATION_JITTER = 2
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
ANNULUS_RADIUS_FRAC = 0.28
ANNULUS_SAMPLES = 24

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


def _warp_pad() -> int:
    return int(WARP_SIZE * WARP_PAD_FRAC)


def _warp(image: np.ndarray, corners: Sequence[Corner]) -> np.ndarray:
    pad = _warp_pad()
    source = np.array(corners, dtype=np.float32)
    low, high = pad, WARP_SIZE - 1 - pad
    target = np.array(
        [[low, low], [high, low], [high, high], [low, high]],
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
    # Replicate the border so a quad at the image edge (screenshots) does not
    # introduce a black frame whose gradients would read as grid lines.
    return cv2.warpPerspective(
        image,
        matrix,
        (WARP_SIZE, WARP_SIZE),
        flags=interpolation,
        borderMode=cv2.BORDER_REPLICATE,
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
    peaks = _find_peaks(_smooth(profile, 5))
    # Grid lines live inside the quad, overflowing it only by a bowed line's
    # bulge; peaks farther into the pad are page content (captions, titles).
    pad = _warp_pad()
    overflow = pad * LINE_OVERFLOW_FRAC
    low = pad - overflow
    high = WARP_SIZE - 1 - pad + overflow
    return [peak for peak in peaks if low <= peak <= high]


def _continuation_fraction(
    gray: np.ndarray,
    background: float,
    cell: float,
    line_positions: list[int],
    edge: int,
    direction: int,
    axis: str,
) -> float:
    """Fraction of grid lines whose pixels continue past the outermost
    perpendicular line at ``edge``, probed ``direction`` (+1/-1) into the
    padded warp. A small jitter along each line tolerates rasterisation and
    mild page bow."""

    height, width = gray.shape
    probe_limit = width if axis == "x" else height
    along_limit = height if axis == "x" else width

    continued = 0
    for position in line_positions:
        found = False
        for frac in CONTINUATION_OFFSET_FRACS:
            probe = int(round(edge + direction * cell * frac))
            if not 0 <= probe < probe_limit:
                continue
            for jitter in range(-CONTINUATION_JITTER, CONTINUATION_JITTER + 1):
                along = position + jitter
                if not 0 <= along < along_limit:
                    continue
                value = gray[along, probe] if axis == "x" else gray[probe, along]
                if abs(float(value) - background) > CONTINUATION_DELTA:
                    found = True
                    break
            if found:
                break
        continued += found
    return continued / len(line_positions) if line_positions else 0.0


def _real_sides(gray: np.ndarray, xs: list[int], ys: list[int]) -> dict[str, bool]:
    """Whether each side is a real board edge or a cut (board continues).

    Decided by probing the padded warp just outside the outermost grid lines:
    a cut side's perpendicular lines keep going (or are replicated outward
    when the capture ends exactly there), while a real edge shows only margin.
    This works whether the corners were placed exactly on the board corners or
    with margin included."""

    background = float(np.median(gray))
    cell = _cell_size(xs, ys)

    def is_real(line_positions: list[int], edge: int, direction: int, axis: str) -> bool:
        fraction = _continuation_fraction(
            gray, background, cell, line_positions, edge, direction, axis
        )
        return fraction < CONTINUATION_THRESHOLD

    return {
        "left": is_real(ys, xs[0], -1, "x"),
        "right": is_real(ys, xs[-1], 1, "x"),
        "top": is_real(xs, ys[0], -1, "y"),
        "bottom": is_real(xs, ys[-1], 1, "y"),
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


def _annulus_median(
    gray: np.ndarray, cx: int, cy: int, cell: float
) -> float | None:
    """Median brightness on a circle inside the stone body. The radius sits
    outside printed labels (move numbers on kifu stones) but inside a white
    stone's outline ring, so central text cannot drag the estimate dark."""

    height, width = gray.shape
    radius = cell * ANNULUS_RADIUS_FRAC
    samples: list[float] = []
    for k in range(ANNULUS_SAMPLES):
        angle = 2.0 * np.pi * k / ANNULUS_SAMPLES
        px = int(round(cx + radius * np.cos(angle)))
        py = int(round(cy + radius * np.sin(angle)))
        if 0 <= px < width and 0 <= py < height:
            samples.append(float(gray[py, px]))
    return float(np.median(samples)) if samples else None


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
            annulus = _annulus_median(gray, x, y, cell)
            annulus_diff = annulus - background if annulus is not None else diff
            if diff < -FILL_DARK_DELTA and annulus_diff < -FILL_DARK_DELTA:
                # A solid dark fill: a black stone (any board), or a white stone
                # on a dark board is handled by the bright branch below. The
                # annulus check keeps dark printed labels on a white stone from
                # reading as black; a vetoed dark centre falls through to the
                # branches below.
                stones.append(SetupStone(x=start_x + i, y=start_y + j, color="B"))
                confidences.append(min(1.0, -diff / (2.0 * FILL_DARK_DELTA)))
            elif diff > FILL_LIGHT_DELTA or annulus_diff > FILL_LIGHT_DELTA:
                # A solid bright fill: a white stone on a wood or dark board.
                # The annulus recovers white stones whose centre median was
                # dragged to board level by printed labels.
                stones.append(SetupStone(x=start_x + i, y=start_y + j, color="W"))
                confidences.append(
                    min(1.0, max(diff, annulus_diff) / (2.0 * FILL_LIGHT_DELTA))
                )
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
    sides = _real_sides(gray, xs, ys)
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
