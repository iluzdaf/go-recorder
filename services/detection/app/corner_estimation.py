"""Automatic board-corner estimation.

Suggests where the four outer grid intersections sit in an uploaded image so
corner handles can start in the right place. Two-stage: find a candidate
board quad (the largest convex quadrilateral contour, else the whole image),
rectify it with the existing warp, locate the grid lines, and map the outer
intersections back into original image coordinates.
"""

from __future__ import annotations

import cv2
import numpy as np

from .detection import Corner, WARP_SIZE, _decode, _line_positions, _warp, _warp_pad

# A board quad must fill a reasonable share of the photo; smaller
# quadrilaterals are stones, diagrams on facing pages, or clutter.
MIN_QUAD_AREA_FRAC = 0.2
CONTOUR_CANDIDATES = 10
# An estimate needs a grid-like line count to be trustworthy; with fewer
# lines the caller keeps its default corner placement.
MIN_GRID_LINES = 4
# A real grid line (or board edge) has line-coloured pixels along most of its
# span; a texture or image-border artefact does not. Outermost candidates
# without support are trimmed before the corners are read off.
LINE_SUPPORT_SAMPLES = 25
LINE_SUPPORT_THRESHOLD = 0.55
LINE_SUPPORT_DELTA = 30.0
LINE_SUPPORT_JITTER = 3
# The physical edge of the board surface also reads as a line, but the strip
# just outside it is not board-coloured (table, page background). The strip
# outside a true outer grid line is the board margin. Offsets are fractions
# of the grid pitch, small enough to stay inside coordinate labels.
SURFACE_OFFSET_FRACS = (0.10, 0.18, 0.25)
SURFACE_DELTA = 40.0
SURFACE_EDGE_THRESHOLD = 0.5


def _order_quad(points: np.ndarray) -> np.ndarray:
    """Order four points TL, TR, BR, BL."""

    sums = points.sum(axis=1)
    diffs = points[:, 0] - points[:, 1]
    return np.array(
        [
            points[np.argmin(sums)],
            points[np.argmax(diffs)],
            points[np.argmax(sums)],
            points[np.argmin(diffs)],
        ],
        dtype=np.float32,
    )


def _board_quad(image: np.ndarray) -> np.ndarray | None:
    """The largest convex quadrilateral contour, if one dominates the photo."""

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    edges = cv2.dilate(edges, np.ones((3, 3), dtype=np.uint8))
    contours, _ = cv2.findContours(
        edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    image_area = float(image.shape[0] * image.shape[1])
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[
        :CONTOUR_CANDIDATES
    ]:
        if cv2.contourArea(contour) < image_area * MIN_QUAD_AREA_FRAC:
            break
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) == 4 and cv2.isContourConvex(approx):
            return _order_quad(approx.reshape(4, 2).astype(np.float32))
    return None


def _line_support(
    gray: np.ndarray,
    coordinate: int,
    span: tuple[float, float],
    axis: str,
    background: float,
) -> float:
    """Fraction of sample points along a candidate line that hold
    line-coloured (non-board) pixels."""

    height, width = gray.shape
    limit = height if axis == "x" else width
    if not 0 <= coordinate < (width if axis == "x" else height):
        return 0.0

    hits = 0
    for position in np.linspace(span[0], span[1], LINE_SUPPORT_SAMPLES):
        found = False
        for jitter in range(-LINE_SUPPORT_JITTER, LINE_SUPPORT_JITTER + 1):
            along = int(round(position)) + jitter
            if not 0 <= along < limit:
                continue
            value = (
                gray[along, coordinate] if axis == "x" else gray[coordinate, along]
            )
            if abs(float(value) - background) > LINE_SUPPORT_DELTA:
                found = True
                break
        hits += found
    return hits / LINE_SUPPORT_SAMPLES


def _trim_unsupported(
    gray: np.ndarray,
    positions: list[int],
    span: tuple[float, float],
    axis: str,
    background: float,
) -> list[int]:
    positions = list(positions)
    while positions and (
        _line_support(gray, positions[0], span, axis, background)
        < LINE_SUPPORT_THRESHOLD
    ):
        positions.pop(0)
    while positions and (
        _line_support(gray, positions[-1], span, axis, background)
        < LINE_SUPPORT_THRESHOLD
    ):
        positions.pop()
    return positions


def _outside_edge_fraction(
    gray: np.ndarray,
    coordinate: int,
    span: tuple[float, float],
    axis: str,
    direction: int,
    pitch: float,
    background: float,
) -> float:
    """Fraction of sample points whose strip just outside a candidate outer
    line is not board-coloured (the surface ends there)."""

    height, width = gray.shape
    limit = width if axis == "x" else height
    non_board = 0
    for position in np.linspace(span[0], span[1], LINE_SUPPORT_SAMPLES):
        values = []
        for fraction in SURFACE_OFFSET_FRACS:
            probe = int(round(coordinate + direction * pitch * fraction))
            if not 0 <= probe < limit:
                continue
            along = int(round(position))
            value = gray[along, probe] if axis == "x" else gray[probe, along]
            values.append(float(value))
        if values and abs(float(np.median(values)) - background) > SURFACE_DELTA:
            non_board += 1
    return non_board / LINE_SUPPORT_SAMPLES


def _trim_surface_edges(
    gray: np.ndarray,
    positions: list[int],
    span: tuple[float, float],
    axis: str,
    pitch: float,
    background: float,
) -> list[int]:
    positions = list(positions)
    if positions and (
        _outside_edge_fraction(
            gray, positions[0], span, axis, -1, pitch, background
        )
        > SURFACE_EDGE_THRESHOLD
    ):
        positions.pop(0)
    if positions and (
        _outside_edge_fraction(
            gray, positions[-1], span, axis, 1, pitch, background
        )
        > SURFACE_EDGE_THRESHOLD
    ):
        positions.pop()
    return positions


def _grid_corners_within(
    image: np.ndarray, quad: np.ndarray
) -> list[Corner] | None:
    """Outer grid intersections found inside a quad, in image coordinates."""

    warped = _warp(image, [tuple(point) for point in quad])
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    # Board brightness from the central region, uncontaminated by whatever
    # surrounds the board inside the padded warp.
    quarter = WARP_SIZE // 4
    background = float(np.median(gray[quarter:-quarter, quarter:-quarter]))

    pad = _warp_pad()
    span = (float(pad), float(WARP_SIZE - 1 - pad))
    xs = _trim_unsupported(
        gray, _line_positions(gray, "vertical"), span, "x", background
    )
    ys = _trim_unsupported(
        gray, _line_positions(gray, "horizontal"), span, "y", background
    )
    if len(xs) < 2 or len(ys) < 2:
        return None

    pitches = list(np.diff(xs)) + list(np.diff(ys))
    pitch = float(np.median(pitches))
    xs = _trim_surface_edges(gray, xs, span, "x", pitch, background)
    ys = _trim_surface_edges(gray, ys, span, "y", pitch, background)
    if len(xs) < MIN_GRID_LINES or len(ys) < MIN_GRID_LINES:
        return None

    low, high = pad, WARP_SIZE - 1 - pad
    target = np.float32([[low, low], [high, low], [high, high], [low, high]])
    matrix = cv2.getPerspectiveTransform(np.float32(quad), target)
    inverse = np.linalg.inv(matrix)
    warp_points = np.float32(
        [
            [[xs[0], ys[0]]],
            [[xs[-1], ys[0]]],
            [[xs[-1], ys[-1]]],
            [[xs[0], ys[-1]]],
        ]
    )
    image_points = cv2.perspectiveTransform(warp_points, inverse).reshape(4, 2)

    height, width = image.shape[:2]
    corners: list[Corner] = []
    for x, y in image_points:
        corners.append(
            (
                float(np.clip(x, 0, width - 1)),
                float(np.clip(y, 0, height - 1)),
            )
        )
    return corners


def estimate_corners(raw: bytes) -> list[Corner] | None:
    """Estimate the outer grid-intersection corners of the board in an image.

    Returns ``None`` when no plausible board grid is found; callers keep
    their default corner placement in that case.
    """

    image = _decode(raw)
    height, width = image.shape[:2]
    full_quad = np.float32(
        [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]]
    )

    quad = _board_quad(image)
    if quad is not None:
        corners = _grid_corners_within(image, quad)
        if corners is not None:
            return corners
    return _grid_corners_within(image, full_quad)
