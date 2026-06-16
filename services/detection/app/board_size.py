"""Board-size auto-detection helpers.

The service supports the three standard Go board sizes. Board size is inferred
from the number of detected grid lines; there is no client-provided hint.
"""

from __future__ import annotations

from .schemas import BoardSize

STANDARD_SIZES: tuple[BoardSize, ...] = (9, 13, 19)


def snap_board_size(line_count: int) -> tuple[BoardSize, float]:
    """Snap a detected line count to the nearest standard board size.

    Returns the size and a confidence in ``[0, 1]`` that decays with the
    distance between the detected count and the chosen standard size.
    """

    nearest = min(STANDARD_SIZES, key=lambda size: abs(size - line_count))
    distance = abs(nearest - line_count)
    confidence = max(0.0, 1.0 - distance / 4.0)
    return nearest, confidence


def smallest_fitting_size(line_count: int) -> BoardSize:
    """Return the smallest standard board size that fits ``line_count`` lines."""

    for size in STANDARD_SIZES:
        if size >= line_count:
            return size
    return STANDARD_SIZES[-1]
