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
# At its crossings with the perpendicular grid, a real line shows bimodal
# evidence: genuinely dark intersections, or bright stones sitting on it. A
# coordinate-label smear in the margin is a flat mid-grey — differing from the
# board, but neither strongly dark nor stone-bright. Deltas are measured from
# the board background; a line needs a few such crossings to be kept.
GRID_DARK_DELTA = 100.0
GRID_BRIGHT_DELTA = 50.0
GRID_EVIDENCE_MIN = 2
LINE_SUPPORT_JITTER = 3
# A real grid line is continuous between crossings; a row or column of dark
# coordinate labels has board-coloured gaps between the glyphs, even though
# the glyphs themselves supply strong evidence at the crossings.
LINE_GAP_BOARD_DELTA = 25.0
LINE_GAP_BOARD_MAX_FRAC = 0.5
# Grid lines are evenly spaced; the dominant run of near-constant spacing is
# the grid and already excludes irregular margin clutter.
PITCH_TOLERANCE_FRAC = 0.35
# The physical edge of the board surface has non-board (table, page) just
# beyond it; the strip outside a true outer grid line is board margin, even
# with sparse coordinate labels. Judged by the strip's median, so labels do
# not tip it. Offsets are fractions of the grid pitch.
SURFACE_OFFSET_FRACS = (0.10, 0.18, 0.25)
SURFACE_DELTA = 40.0
SURFACE_SAMPLES = 25
# Returned corners are pushed slightly outward so the outer grid lines land
# fully inside the quad with a cushion, the way users are asked to mark them.
# A quad edge slicing along the outer line leaves detection at the mercy of
# JPEG artefacts from re-encoding photo pickers.
CORNER_CUSHION_FRAC = 0.015
CORNER_CUSHION_MIN_PX = 3.0
CORNER_CUSHION_MAX_PX = 12.0


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


def _regular_run(positions: list[int]) -> list[int]:
    """The longest run of near-evenly-spaced lines (the grid), which excludes
    irregular margin clutter."""

    if len(positions) < 3:
        return list(positions)
    diffs = np.diff(positions)
    pitch = float(np.median(diffs))
    tolerance = pitch * PITCH_TOLERANCE_FRAC

    best_start, best_len = 0, 1
    start = 0
    for index in range(1, len(positions)):
        if abs(float(positions[index] - positions[index - 1]) - pitch) <= tolerance:
            if index - start + 1 > best_len:
                best_start, best_len = start, index - start + 1
        else:
            start = index
    return list(positions[best_start : best_start + best_len])


def _grid_evidence(
    gray: np.ndarray,
    coordinate: int,
    crossings: list[int],
    axis: str,
    background: float,
) -> int:
    """Count of perpendicular crossings with real grid evidence: a strongly
    dark intersection or a stone bright against the board. A flat mid-grey
    label smear scores zero."""

    height, width = gray.shape
    if not 0 <= coordinate < (width if axis == "x" else height):
        return 0
    limit = height if axis == "x" else width

    evidence = 0
    for crossing in crossings:
        darkest = background
        brightest = background
        for jitter in range(-LINE_SUPPORT_JITTER, LINE_SUPPORT_JITTER + 1):
            along = crossing + jitter
            if not 0 <= along < limit:
                continue
            value = float(
                gray[along, coordinate] if axis == "x" else gray[coordinate, along]
            )
            darkest = min(darkest, value)
            brightest = max(brightest, value)
        if (
            background - darkest > GRID_DARK_DELTA
            or brightest - background > GRID_BRIGHT_DELTA
        ):
            evidence += 1
    return evidence


def _board_gap_fraction(
    gray: np.ndarray,
    coordinate: int,
    crossings: list[int],
    axis: str,
    background: float,
) -> float:
    """Fraction of inter-crossing midpoints that are board-coloured. A real
    grid line stays line-dark (or stone-covered) between crossings; a line of
    coordinate labels shows board between the glyphs."""

    height, width = gray.shape
    if not 0 <= coordinate < (width if axis == "x" else height):
        return 1.0
    limit = height if axis == "x" else width

    perpendicular_limit = width if axis == "x" else height
    midpoints = [
        (first + second) // 2 for first, second in zip(crossings, crossings[1:])
    ]
    board_like = 0
    for midpoint in midpoints:
        if not 0 <= midpoint < limit:
            continue
        strongest = 0.0
        # Jitter across the line: the detected peak can sit a pixel or two
        # off the actual line pixels.
        for jitter in range(-LINE_SUPPORT_JITTER, LINE_SUPPORT_JITTER + 1):
            across = coordinate + jitter
            if not 0 <= across < perpendicular_limit:
                continue
            value = float(
                gray[midpoint, across] if axis == "x" else gray[across, midpoint]
            )
            strongest = max(strongest, abs(value - background))
        if strongest <= LINE_GAP_BOARD_DELTA:
            board_like += 1
    return board_like / len(midpoints) if midpoints else 1.0


def _is_grid_line(
    gray: np.ndarray,
    coordinate: int,
    crossings: list[int],
    axis: str,
    background: float,
) -> bool:
    return (
        _grid_evidence(gray, coordinate, crossings, axis, background)
        >= GRID_EVIDENCE_MIN
        and _board_gap_fraction(gray, coordinate, crossings, axis, background)
        <= LINE_GAP_BOARD_MAX_FRAC
    )


def _trim_unsupported(
    gray: np.ndarray,
    positions: list[int],
    crossings: list[int],
    axis: str,
    background: float,
) -> list[int]:
    positions = list(positions)
    while positions and not _is_grid_line(
        gray, positions[0], crossings, axis, background
    ):
        positions.pop(0)
    while positions and not _is_grid_line(
        gray, positions[-1], crossings, axis, background
    ):
        positions.pop()
    return positions


def _outside_is_surface_edge(
    gray: np.ndarray,
    coordinate: int,
    span: tuple[float, float],
    axis: str,
    direction: int,
    pitch: float,
    background: float,
) -> bool:
    """Whether the strip just outside a candidate outer line is predominantly
    non-board — a table or page beyond the board's physical edge. Judged by
    the strip's median, so sparse coordinate labels on the margin do not tip
    it (their board-coloured surroundings dominate)."""

    height, width = gray.shape
    limit = width if axis == "x" else height
    samples: list[float] = []
    for position in np.linspace(span[0], span[1], SURFACE_SAMPLES):
        along = int(round(position))
        for fraction in SURFACE_OFFSET_FRACS:
            probe = int(round(coordinate + direction * pitch * fraction))
            if not 0 <= probe < limit:
                continue
            samples.append(
                float(gray[along, probe] if axis == "x" else gray[probe, along])
            )
    if not samples:
        return False
    return abs(float(np.median(samples)) - background) > SURFACE_DELTA


def _trim_surface_edges(
    gray: np.ndarray,
    positions: list[int],
    span: tuple[float, float],
    axis: str,
    pitch: float,
    background: float,
) -> list[int]:
    positions = list(positions)
    if positions and _outside_is_surface_edge(
        gray, positions[0], span, axis, -1, pitch, background
    ):
        positions.pop(0)
    if positions and _outside_is_surface_edge(
        gray, positions[-1], span, axis, 1, pitch, background
    ):
        positions.pop()
    return positions


def _grid_corners_within(
    image: np.ndarray, quad: np.ndarray
) -> list[Corner] | None:
    """Outer grid intersections found inside a quad, in image coordinates."""

    warped = _warp(image, [tuple(point) for point in quad])
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    pad = _warp_pad()
    # Board brightness from the central region, uncontaminated by whatever
    # surrounds the board inside the padded warp.
    quarter = WARP_SIZE // 4
    background = float(np.median(gray[quarter:-quarter, quarter:-quarter]))

    xs_raw = _line_positions(gray, "vertical")
    ys_raw = _line_positions(gray, "horizontal")
    if len(xs_raw) < 2 or len(ys_raw) < 2:
        return None

    # The dominant even run is the grid; it already drops irregular margin
    # clutter. Its outermost lines are then confirmed by grid evidence at the
    # perpendicular crossings, dropping a flat label smear one pitch out.
    x_grid = _regular_run(xs_raw)
    y_grid = _regular_run(ys_raw)
    xs = _trim_unsupported(gray, x_grid, y_grid, "x", background)
    ys = _trim_unsupported(gray, y_grid, x_grid, "y", background)
    if len(xs) < 2 or len(ys) < 2:
        return None

    pitches = list(np.diff(xs)) + list(np.diff(ys))
    pitch = float(np.median(pitches))
    xs = _trim_surface_edges(
        gray, xs, (float(ys[0]), float(ys[-1])), "x", pitch, background
    )
    ys = _trim_surface_edges(
        gray, ys, (float(xs[0]), float(xs[-1])), "y", pitch, background
    )
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

    # Push the corners slightly outward so the outer lines sit fully inside
    # the marked quad with a cushion.
    centroid = image_points.mean(axis=0)
    smaller_side = float(
        min(
            image_points[:, 0].max() - image_points[:, 0].min(),
            image_points[:, 1].max() - image_points[:, 1].min(),
        )
    )
    cushion = float(
        np.clip(
            smaller_side * CORNER_CUSHION_FRAC,
            CORNER_CUSHION_MIN_PX,
            CORNER_CUSHION_MAX_PX,
        )
    )

    height, width = image.shape[:2]
    corners: list[Corner] = []
    for point in image_points:
        vector = point - centroid
        norm = float(np.linalg.norm(vector))
        if norm > 0:
            point = point + vector / norm * cushion
        corners.append(
            (
                float(np.clip(point[0], 0, width - 1)),
                float(np.clip(point[1], 0, height - 1)),
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
