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
# Periodicity-based localization for pages: a Go grid is periodic in both
# axes with similar pitch, while text is periodic in at most one axis. Tiles
# whose gradient profiles autocorrelate strongly in both axes localize the
# board, so page text cannot contaminate the grid search.
PERIODIC_SCALE_MAX = 1000.0
PERIODIC_TILES = 8
PERIODIC_MIN_STRENGTH = 0.3
# Below ~10px the autocorrelation locks onto JPEG block texture, not grid.
PERIODIC_MIN_PITCH = 10
PERIODIC_PITCH_RATIO = 1.7
PERIODIC_MIN_TILES = 4
# Tiles in the board block share the grid pitch; qualifying tiles whose pitch
# strays (noise, other periodic content) are dropped before the bounding box.
PERIODIC_COHERENCE_RATIO = 1.35
# A text band holds dense dark glyph pixels (measured: 0.10-0.23 over the
# central third); a board band holds thin lines (~0.05-0.07); a margin or
# paragraph-gap band almost none. Text and empty bands are trimmed from the
# region's edges; anything grid-like or in between stops the march, and no
# side may trim beyond this share of the region.
TEXT_DARKNESS_MAX = 120.0
TEXT_MIN_DARK_FRAC = 0.09
EMPTY_MAX_DARK_FRAC = 0.02
TRIM_MAX_SHARE = 0.45
# A Go board has at most 19 lines per axis; a "grid" with more is page
# content masquerading as one.
MAX_GRID_LINES = 21
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
# One crossing of real evidence (a stone, or a dark intersection) is enough to
# keep an outer line, so a faint board-edge line with a single stone on it is
# not clipped. A flat mid-grey label smear has zero and is still rejected; a
# label row is caught by the board-gap test regardless of its evidence.
GRID_EVIDENCE_MIN = 1
LINE_SUPPORT_JITTER = 3
# A real grid line is continuous between crossings; a row or column of dark
# coordinate labels has board-coloured gaps between the glyphs, even though
# the glyphs themselves supply strong evidence at the crossings.
LINE_GAP_BOARD_DELTA = 25.0
LINE_GAP_BOARD_MAX_FRAC = 0.5
# The physical edge of the board surface has non-board (table, page) just
# beyond it; the strip outside a true outer grid line is board margin, even
# with sparse coordinate labels. Judged by the strip's median, so labels do
# not tip it. Offsets are fractions of the grid pitch.
SURFACE_OFFSET_FRACS = (0.10, 0.18, 0.25)
# Table or page background beyond a physical board edge differs from the
# board by 75+; page-margin shading next to a book grid's outer line reads
# around 45 and must not trim that line.
SURFACE_DELTA = 60.0
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


def _axis_periodicity(profile: np.ndarray, max_pitch: int) -> tuple[float, int]:
    """Autocorrelation peak strength and pitch of a 1D gradient profile."""

    centred = profile - profile.mean()
    if centred.std() < 1e-6:
        return 0.0, 0
    correlation = np.correlate(centred, centred, mode="full")[len(centred) - 1 :]
    correlation = correlation / (correlation[0] + 1e-9)
    if max_pitch <= PERIODIC_MIN_PITCH:
        return 0.0, 0
    lag = int(np.argmax(correlation[PERIODIC_MIN_PITCH:max_pitch])) + PERIODIC_MIN_PITCH
    return float(correlation[lag]), lag


def _band_is_trimmable(
    gray_band: np.ndarray, gradient_band: np.ndarray, axis: int, pitch: float
) -> bool:
    """Whether an edge band is page content rather than board: dense dark
    glyphs without grid periodicity (text, captions), or nearly empty paper
    (margins, paragraph gaps). A grid-like band — even a dense one, whose
    stones keep the pitch periodicity — stops the trim."""

    # Density over the central third along the band: a centred caption fills
    # the middle while its full-width density stays low.
    if axis == 0:
        third = gray_band.shape[1] // 3
        centre = gray_band[:, third : 2 * third] if third else gray_band
    else:
        third = gray_band.shape[0] // 3
        centre = gray_band[third : 2 * third, :] if third else gray_band
    dark_fraction = float((centre < TEXT_DARKNESS_MAX).mean())
    if dark_fraction < EMPTY_MAX_DARK_FRAC:
        return True
    if dark_fraction < TEXT_MIN_DARK_FRAC:
        return False
    profile = gradient_band.sum(axis=axis)
    limit = int(pitch * PERIODIC_PITCH_RATIO) + 2
    strength, lag = _axis_periodicity(profile, min(limit, len(profile) // 2))
    gridlike = (
        lag > 0
        and strength > PERIODIC_MIN_STRENGTH
        and 1.0 / PERIODIC_COHERENCE_RATIO < lag / pitch < PERIODIC_COHERENCE_RATIO
    )
    return not gridlike


def _trim_region_bands(
    gray: np.ndarray,
    grad_x: np.ndarray,
    grad_y: np.ndarray,
    left: int,
    right: int,
    top: int,
    bottom: int,
    pitch: float,
) -> tuple[int, int, int, int]:
    """Trim page-content bands (titles, captions, paragraphs, blank margins)
    from the region's edges, stopping at grid-like content."""

    band = max(8, int(round(pitch)))
    max_trim_y = int((bottom - top) * TRIM_MAX_SHARE)
    max_trim_x = int((right - left) * TRIM_MAX_SHARE)
    top_limit, bottom_limit = top + max_trim_y, bottom - max_trim_y
    left_limit, right_limit = left + max_trim_x, right - max_trim_x

    while top < top_limit and _band_is_trimmable(
        gray[top : top + band, left:right],
        grad_x[top : top + band, left:right],
        0,
        pitch,
    ):
        top += band
    while bottom > bottom_limit and _band_is_trimmable(
        gray[bottom - band : bottom, left:right],
        grad_x[bottom - band : bottom, left:right],
        0,
        pitch,
    ):
        bottom -= band
    while left < left_limit and _band_is_trimmable(
        gray[top:bottom, left : left + band],
        grad_y[top:bottom, left : left + band],
        1,
        pitch,
    ):
        left += band
    while right > right_limit and _band_is_trimmable(
        gray[top:bottom, right - band : right],
        grad_y[top:bottom, right - band : right],
        1,
        pitch,
    ):
        right -= band
    return left, right, top, bottom


def _periodic_region(image: np.ndarray) -> np.ndarray | None:
    """Bounding quad of the region that is periodic in both axes (the grid).

    Text on a page is periodic in at most one axis, so the connected block of
    two-axis-periodic tiles is the board even when it shares the frame with
    paragraphs, captions, and margins."""

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    scale = min(1.0, PERIODIC_SCALE_MAX / max(height, width))
    if scale < 1.0:
        gray = cv2.resize(
            gray,
            (int(width * scale), int(height * scale)),
            interpolation=cv2.INTER_AREA,
        )
    grad_x = np.abs(cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3))
    grad_y = np.abs(cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3))

    tiles = PERIODIC_TILES
    tile_h = gray.shape[0] // tiles
    tile_w = gray.shape[1] // tiles
    if tile_h < 2 * PERIODIC_MIN_PITCH or tile_w < 2 * PERIODIC_MIN_PITCH:
        return None

    qualified = np.zeros((tiles, tiles), dtype=bool)
    pitches = np.zeros((tiles, tiles))
    for tj in range(tiles):
        for ti in range(tiles):
            tile_gx = grad_x[tj * tile_h : (tj + 1) * tile_h, ti * tile_w : (ti + 1) * tile_w]
            tile_gy = grad_y[tj * tile_h : (tj + 1) * tile_h, ti * tile_w : (ti + 1) * tile_w]
            strength_x, pitch_x = _axis_periodicity(tile_gx.sum(axis=0), tile_w // 2)
            strength_y, pitch_y = _axis_periodicity(tile_gy.sum(axis=1), tile_h // 2)
            if (
                pitch_x
                and pitch_y
                and min(strength_x, strength_y) > PERIODIC_MIN_STRENGTH
                and 1.0 / PERIODIC_PITCH_RATIO < pitch_x / pitch_y < PERIODIC_PITCH_RATIO
            ):
                qualified[tj, ti] = True
                pitches[tj, ti] = (pitch_x + pitch_y) / 2.0

    if not qualified.any():
        return None
    # The board block shares one pitch; drop qualifying tiles that stray.
    board_pitch = float(np.median(pitches[qualified]))
    coherent = qualified & (
        (pitches > board_pitch / PERIODIC_COHERENCE_RATIO)
        & (pitches < board_pitch * PERIODIC_COHERENCE_RATIO)
    )

    # Largest connected component of coherent tiles.
    count, labels = cv2.connectedComponents(coherent.astype(np.uint8))
    best_label, best_size = 0, 0
    for label in range(1, count):
        size = int((labels == label).sum())
        if size > best_size:
            best_label, best_size = label, size
    if best_size < PERIODIC_MIN_TILES:
        return None

    component = labels == best_label
    # Text with line spacing near the grid pitch can attach a stray tile to
    # the block; the board occupies multiple tiles per row and column, so
    # keep only rows and columns with a meaningful share of the block.
    row_counts = component.sum(axis=1)
    col_counts = component.sum(axis=0)
    row_keep = row_counts >= max(2, int(row_counts.max() * 0.4))
    col_keep = col_counts >= max(2, int(col_counts.max() * 0.4))
    if not row_keep.any() or not col_keep.any():
        return None
    rows = np.where(row_keep)[0]
    cols = np.where(col_keep)[0]

    # One-tile margin so the outer lines sit inside the region.
    left = max(0, cols.min() - 0) * tile_w
    right = min(tiles, cols.max() + 2) * tile_w
    top = max(0, rows.min() - 0) * tile_h
    bottom = min(tiles, rows.max() + 2) * tile_h

    left, right, top, bottom = _trim_region_bands(
        gray, grad_x, grad_y, left, right, top, bottom, board_pitch
    )

    left, top = left / scale, top / scale
    right, bottom = right / scale, bottom / scale
    right = min(right, width - 1)
    bottom = min(bottom, height - 1)
    return np.float32(
        [[left, top], [right, top], [right, bottom], [left, bottom]]
    )


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

    # Extension recovers faintly printed outer lines; the trims below vet
    # every line it adds, so labels and captions cannot ride in.
    xs_raw = _line_positions(gray, "vertical", extend=True)
    ys_raw = _line_positions(gray, "horizontal", extend=True)
    if len(xs_raw) < 2 or len(ys_raw) < 2:
        return None

    # _line_positions already reduces peaks to the dominant even chain (the
    # grid), dropping irregular margin clutter. Its outermost lines are then
    # confirmed by grid evidence at the perpendicular crossings, dropping a
    # flat label smear one pitch out.
    xs = _trim_unsupported(gray, xs_raw, ys_raw, "x", background)
    ys = _trim_unsupported(gray, ys_raw, xs_raw, "y", background)
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
    if len(xs) > MAX_GRID_LINES or len(ys) > MAX_GRID_LINES:
        # More lines than any Go board has: page content masquerading as a
        # grid. Reject so a later stage (or the default corners) applies.
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
    # Faint printed grids (book pages) give no contour; the block of
    # coherently grid-like tiles localizes the board among page text.
    region = _periodic_region(image)
    if region is not None:
        corners = _grid_corners_within(image, region)
        if corners is not None:
            return corners
    return _grid_corners_within(image, full_quad)
