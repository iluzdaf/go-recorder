"""Synthetic top-down board image generator for deterministic tests.

Renders a wood background with a regular grid and stones. ``real_sides`` marks
which board edges carry a wood margin (a real board edge); unmarked sides place
the outermost grid line near the image border (a cut/partial side). Because the
image is already top-down, the four image corners are passed as the detection
corners, so warping is near-identity.
"""

from __future__ import annotations

import cv2
import numpy as np

WOOD = 185
LINE = 60
BLACK = 30
WHITE = 235

ALL_REAL = {"left": True, "right": True, "top": True, "bottom": True}


def render_board(
    size: int,
    stones: list[tuple[int, int, str]],
    real_sides: dict[str, bool] | None = None,
    img_size: int = 720,
    margin_frac: float = 0.06,
    cut_frac: float = 0.01,
) -> bytes:
    """Render a board and return PNG-encoded bytes.

    ``stones`` are ``(column, row, color)`` in visible-grid coordinates.
    """

    sides = real_sides or ALL_REAL
    image = np.full((img_size, img_size, 3), WOOD, dtype=np.uint8)
    margin = int(img_size * margin_frac)
    cut = int(img_size * cut_frac)

    def positions(real_low: bool, real_high: bool) -> np.ndarray:
        low = margin if real_low else cut
        high = (img_size - 1 - margin) if real_high else (img_size - 1 - cut)
        return np.linspace(low, high, size)

    xs = positions(sides["left"], sides["right"])
    ys = positions(sides["top"], sides["bottom"])

    for x in xs:
        cv2.line(image, (int(x), int(ys[0])), (int(x), int(ys[-1])), (LINE, LINE, LINE), 2)
    for y in ys:
        cv2.line(image, (int(xs[0]), int(y)), (int(xs[-1]), int(y)), (LINE, LINE, LINE), 2)

    radius = int((xs[1] - xs[0]) * 0.42)
    for column, row, color in stones:
        shade = BLACK if color == "B" else WHITE
        cv2.circle(image, (int(xs[column]), int(ys[row])), radius, (shade, shade, shade), -1)

    ok, buffer = cv2.imencode(".png", image)
    if not ok:
        raise RuntimeError("Failed to encode synthetic board image")
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
