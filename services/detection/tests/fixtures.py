"""Synthetic top-down board image generator for deterministic tests.

Renders a board with a regular grid and stones in one of several themes. The
default ``WOOD`` theme uses filled white stones; ``LIGHT`` renders outlined
white stones on a light board (like an app screenshot or a printed kifu) where
the fill matches the board; ``DARK`` mirrors the app's dark mode.

``real_sides`` marks which board edges carry a margin (a real board edge);
unmarked sides place the outermost grid line near the image border (a cut /
partial side). Because the image is already top-down, the four image corners are
passed as the detection corners, so warping is near-identity.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

WOOD = 185
LINE = 60
BLACK = 30
WHITE = 235

ALL_REAL = {"left": True, "right": True, "top": True, "bottom": True}


@dataclass(frozen=True)
class Theme:
    board: int
    line: int
    black_fill: int
    white_fill: int
    white_outline: int | None  # None renders a solid white stone


WOOD_THEME = Theme(board=185, line=60, black_fill=30, white_fill=235, white_outline=None)
LIGHT_THEME = Theme(board=235, line=60, black_fill=30, white_fill=235, white_outline=150)
DARK_THEME = Theme(board=110, line=185, black_fill=40, white_fill=235, white_outline=None)
# A low-contrast scanned book page: pale lines, greyish blacks, outlined whites.
PALE_THEME = Theme(board=225, line=170, black_fill=80, white_fill=225, white_outline=140)

# Book-page bow amplitudes (pixels at the default 720 image size).
CURVE_MILD = 4.0
CURVE_MEDIUM = 8.0

# Bow shapes for curve_page (cycles across the image width).
CYCLES_ARCH = 0.5  # single arch, the default book-page bow
CYCLES_S = 1.0  # S-shaped wave
CYCLES_GUTTER = 0.25  # one-sided curl toward the spine

# Measured detector limits per shape: the largest amplitude (at 720px, cell
# ~35px) where 19x19 detection still passes; one more pixel breaks it. The
# S-curve fails far earlier because its two displacement extremes split each
# grid line into two gradient peaks.
CURVE_MAX_ARCH = 12.0
CURVE_MAX_S = 4.0
CURVE_MAX_GUTTER = 12.0

# Column letters as printed on boards and diagrams ("I" is skipped).
COLUMN_LABELS = "ABCDEFGHJKLMNOPQRST"


def render_board(
    size: int,
    stones: list[tuple[int, int, str]],
    real_sides: dict[str, bool] | None = None,
    img_size: int = 720,
    margin_frac: float = 0.06,
    cut_frac: float = 0.01,
    theme: Theme = WOOD_THEME,
    annotations: list[tuple[int, int, str]] | None = None,
    annotation_thickness: int = 1,
    coordinates: bool = False,
    caption: str | None = None,
) -> bytes:
    """Render a board and return PNG-encoded bytes.

    ``stones`` are ``(column, row, color)`` in visible-grid coordinates.
    ``annotations`` are ``(column, row, text)`` printed labels, drawn after
    stones like a book kifu: white text on black stones, black text on white
    stones, line-coloured marks on empty intersections.
    ``coordinates`` prints column letters and row numbers in the margins of
    real sides, like a book diagram or app screenshot.
    ``caption`` prints a title (like "Dia. 1") centred in the bottom margin.
    """

    sides = real_sides or ALL_REAL
    image = np.full((img_size, img_size, 3), theme.board, dtype=np.uint8)
    margin = int(img_size * margin_frac)
    cut = int(img_size * cut_frac)

    def positions(real_low: bool, real_high: bool) -> np.ndarray:
        low = margin if real_low else cut
        high = (img_size - 1 - margin) if real_high else (img_size - 1 - cut)
        return np.linspace(low, high, size)

    xs = positions(sides["left"], sides["right"])
    ys = positions(sides["top"], sides["bottom"])

    line = (theme.line, theme.line, theme.line)
    for x in xs:
        cv2.line(image, (int(x), int(ys[0])), (int(x), int(ys[-1])), line, 2)
    for y in ys:
        cv2.line(image, (int(xs[0]), int(y)), (int(xs[-1]), int(y)), line, 2)

    radius = int((xs[1] - xs[0]) * 0.42)
    for column, row, color in stones:
        center = (int(xs[column]), int(ys[row]))
        if color == "W":
            cv2.circle(image, center, radius, (theme.white_fill,) * 3, -1)
            if theme.white_outline is not None:
                cv2.circle(image, center, radius, (theme.white_outline,) * 3, 3)
        else:
            cv2.circle(image, center, radius, (theme.black_fill,) * 3, -1)

    stone_colors = {(column, row): color for column, row, color in stones}
    for column, row, text in annotations or []:
        color = stone_colors.get((column, row))
        if color == "B":
            value = theme.white_fill
        elif color == "W":
            value = theme.black_fill
        else:
            value = theme.line
        scale = 0.9
        while True:
            (width, height), _ = cv2.getTextSize(
                text, cv2.FONT_HERSHEY_SIMPLEX, scale, annotation_thickness
            )
            # Cap the glyph half-diagonal so labels stay inside the stone body
            # and clear of the classifier's annulus samples.
            if np.hypot(width, height) / 2 <= 0.55 * radius or scale <= 0.1:
                break
            scale -= 0.05
        origin = (
            int(xs[column] - round(width / 2)),
            int(ys[row] + round(height / 2)),
        )
        cv2.putText(
            image,
            text,
            origin,
            cv2.FONT_HERSHEY_SIMPLEX,
            scale,
            (value,) * 3,
            annotation_thickness,
            cv2.LINE_AA,
        )

    if coordinates:
        color = (theme.line,) * 3
        font = cv2.FONT_HERSHEY_SIMPLEX
        scale = 0.45

        def put_centered(text: str, cx: int, cy: int) -> None:
            (width, height), _ = cv2.getTextSize(text, font, scale, 1)
            origin = (int(cx - round(width / 2)), int(cy + round(height / 2)))
            cv2.putText(image, text, origin, font, scale, color, 1, cv2.LINE_AA)

        for column, x in enumerate(xs):
            if sides["top"]:
                put_centered(COLUMN_LABELS[column], int(x), margin // 2)
            if sides["bottom"]:
                put_centered(COLUMN_LABELS[column], int(x), img_size - 1 - margin // 2)
        for row, y in enumerate(ys):
            # Rows are numbered from the bottom, as printed on real boards.
            text = str(size - row)
            if sides["left"]:
                put_centered(text, margin // 2, int(y))
            if sides["right"]:
                put_centered(text, img_size - 1 - margin // 2, int(y))

    if caption is not None:
        (width, height), _ = cv2.getTextSize(caption, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
        origin = (
            int(img_size / 2 - round(width / 2)),
            int(img_size - 1 - margin // 2 + round(height / 2)),
        )
        cv2.putText(
            image,
            caption,
            origin,
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (theme.line,) * 3,
            1,
            cv2.LINE_AA,
        )

    ok, buffer = cv2.imencode(".png", image)
    if not ok:
        raise RuntimeError("Failed to encode synthetic board image")
    return buffer.tobytes()


def curve_page(png_bytes: bytes, amplitude_px: float, cycles: float = 0.5) -> bytes:
    """Bow the image vertically like a photographed book page.

    Applies a sinusoidal vertical displacement across the width, bending
    horizontal grid lines while vertical lines stay straight. Corners remain
    the full-image corners. ``cycles`` picks the bow shape: 0.5 is a single
    arch (default), 1.0 an S-curve, 0.25 a one-sided gutter curl.
    """

    image = cv2.imdecode(np.frombuffer(png_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    height, width = image.shape[:2]
    map_x, map_y = np.meshgrid(
        np.arange(width, dtype=np.float32), np.arange(height, dtype=np.float32)
    )
    map_y -= (
        amplitude_px * np.sin(2.0 * np.pi * cycles * map_x / (width - 1))
    ).astype(np.float32)
    curved = cv2.remap(
        image, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE
    )
    ok, buffer = cv2.imencode(".png", curved)
    if not ok:
        raise RuntimeError("Failed to encode curved board image")
    return buffer.tobytes()


def degrade(png_bytes: bytes, blur_sigma: float = 1.2, scale: float = 0.75) -> bytes:
    """Mimic a slightly out-of-focus or downsampled capture."""

    image = cv2.imdecode(np.frombuffer(png_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    height, width = image.shape[:2]
    small = cv2.resize(
        image,
        (int(width * scale), int(height * scale)),
        interpolation=cv2.INTER_AREA,
    )
    restored = cv2.resize(small, (width, height), interpolation=cv2.INTER_LINEAR)
    blurred = cv2.GaussianBlur(restored, (0, 0), blur_sigma)
    ok, buffer = cv2.imencode(".png", blurred)
    if not ok:
        raise RuntimeError("Failed to encode degraded board image")
    return buffer.tobytes()


def full_corners(img_size: int = 720) -> list[dict[str, int]]:
    """Corners of a top-down image in TL, TR, BR, BL order."""

    last = img_size - 1
    return [
        {"x": 0, "y": 0},
        {"x": last, "y": 0},
        {"x": last, "y": last},
        {"x": 0, "y": last},
    ]


def bow_offset(
    x: float, amplitude_px: float, img_size: int = 720, cycles: float = 0.5
) -> float:
    """Vertical displacement curve_page applies to content at column ``x``."""

    return amplitude_px * float(np.sin(2.0 * np.pi * cycles * x / (img_size - 1)))


def board_corners(
    img_size: int = 720,
    margin_frac: float = 0.06,
    bow_amplitude: float = 0.0,
    bow_cycles: float = 0.5,
) -> list[dict[str, float]]:
    """The outer grid intersections of a rendered full board, TL/TR/BR/BL.

    Marks the corners exactly on the board, the way users are asked to, rather
    than on the image corners. ``bow_amplitude`` accounts for curve_page moving
    the corners of a bowed page.
    """

    margin = int(img_size * margin_frac)
    low, high = margin, img_size - 1 - margin
    return [
        {"x": x, "y": y + bow_offset(x, bow_amplitude, img_size, bow_cycles)}
        for x, y in ((low, low), (high, low), (high, high), (low, high))
    ]
