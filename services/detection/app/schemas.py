"""Request/response models for the board-detection service.

Field names mirror the TypeScript app types in ``components/types.ts`` so the
detection result maps directly onto a browser-local board draft.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

Stone = Literal["B", "W"]
BoardSize = Literal[9, 13, 19]
PositionViewAnchor = Literal[
    "full",
    "top-left",
    "top",
    "top-right",
    "left",
    "center",
    "right",
    "bottom-left",
    "bottom",
    "bottom-right",
]


class SetupStone(BaseModel):
    """A detected stone in full-board coordinates (0-indexed)."""

    x: int
    y: int
    color: Stone


class PositionView(BaseModel):
    """Visible sub-region of the board for a partial-board capture."""

    anchor: PositionViewAnchor
    rows: int
    columns: int


class DetectionResult(BaseModel):
    """Detection response consumed by the Next.js draft-creation flow."""

    boardSize: BoardSize
    setupStones: list[SetupStone]
    positionView: Optional[PositionView] = None
    confidence: float
