"""Partial-board position-view inference.

Mirrors the anchor math in ``lib/positionView.ts`` so a partial capture maps to
the same ``PositionView`` model the app already understands. A side is treated
as a real board edge when a wood margin separates the outermost grid line from
the warped image border; cut sides indicate the board continues out of frame.
"""

from __future__ import annotations

from typing import Optional

from .schemas import BoardSize, PositionView, PositionViewAnchor

Sides = dict[str, bool]


def _vertical_anchor(sides: Sides) -> str:
    if sides["top"] and not sides["bottom"]:
        return "top"
    if sides["bottom"] and not sides["top"]:
        return "bottom"
    return "center"


def _horizontal_anchor(sides: Sides) -> str:
    if sides["left"] and not sides["right"]:
        return "left"
    if sides["right"] and not sides["left"]:
        return "right"
    return "center"


def _anchor_name(sides: Sides) -> PositionViewAnchor:
    vertical = _vertical_anchor(sides)
    horizontal = _horizontal_anchor(sides)
    if vertical == "center" and horizontal == "center":
        return "center"
    if vertical == "center":
        return horizontal  # type: ignore[return-value]
    if horizontal == "center":
        return vertical  # type: ignore[return-value]
    return f"{vertical}-{horizontal}"  # type: ignore[return-value]


def range_start(anchor: str, board_size: int, visible: int) -> int:
    """Start index of a visible span within the full board (matches the app)."""

    if anchor == "start":
        return 0
    if anchor == "end":
        return board_size - visible
    return (board_size - visible) // 2


def infer_position_view(
    sides: Sides,
    visible_rows: int,
    visible_columns: int,
    board_size: BoardSize,
) -> tuple[Optional[PositionView], int, int]:
    """Resolve the position view and the full-board offset for detected stones.

    Returns ``(position_view, start_x, start_y)``. ``position_view`` is ``None``
    for a full board, in which case the offsets are zero.
    """

    if all(sides.values()) or (
        visible_rows >= board_size and visible_columns >= board_size
    ):
        return None, 0, 0

    horizontal = _horizontal_anchor(sides)
    vertical = _vertical_anchor(sides)
    start_x = range_start(
        "start" if horizontal == "left" else "end" if horizontal == "right" else "center",
        board_size,
        visible_columns,
    )
    start_y = range_start(
        "start" if vertical == "top" else "end" if vertical == "bottom" else "center",
        board_size,
        visible_rows,
    )
    position_view = PositionView(
        anchor=_anchor_name(sides),
        rows=visible_rows,
        columns=visible_columns,
    )
    return position_view, start_x, start_y
