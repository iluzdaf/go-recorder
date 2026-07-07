"""Draft ground-truth sidecars and review overlays for corpus photos.

For each photo under ``training/corpus`` (or the paths given), runs corner
estimation and detection, writes a draft ``.json`` sidecar next to the photo,
and renders a ``.overlay.png`` showing the registered grid and detected
stones for human review. Sidecars whose ``"verified"`` flag is true are left
untouched; corners in an existing sidecar override estimation, so hard
photos can be labelled manually.

Sidecar schema:
    {
      "corners": [[x, y] * 4],          TL, TR, BR, BL in image pixels
      "board_size": 19,
      "anchor": "full" | position-view anchor,
      "rows": 19, "columns": 19,        visible grid extent
      "stones": {"i,j": "B" | "W"},    visible-grid coordinates
      "verified": false,
      "notes": "",
    }

Run from services/detection:
    .venv/bin/python -m training.label [photo ...]
"""

from __future__ import annotations

import glob
import json
import sys
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.corner_estimation import estimate_corners  # noqa: E402
from app.detection import (  # noqa: E402
    _decode,
    _line_positions,
    _warp,
    detect_board,
    parse_corners,
)


def sidecar_path(photo: Path) -> Path:
    return photo.with_suffix(".json")


def overlay_path(photo: Path) -> Path:
    return photo.with_suffix(".overlay.png")


def draft_sidecar(photo: Path) -> dict | None:
    raw = photo.read_bytes()
    existing = None
    if sidecar_path(photo).exists():
        existing = json.loads(sidecar_path(photo).read_text())
        if existing.get("verified"):
            return existing

    if existing and existing.get("corners"):
        corners = [tuple(point) for point in existing["corners"]]
    else:
        estimated = estimate_corners(raw)
        if estimated is None:
            return None
        corners = [(x, y) for x, y in estimated]

    result = detect_board(
        raw,
        parse_corners(json.dumps([{"x": x, "y": y} for x, y in corners])),
    )
    view = result.positionView
    start_x = start_y = 0
    columns = rows = result.boardSize
    if view is not None:
        columns, rows = view.columns, view.rows
        anchors = view.anchor.split("-")
        if "right" in anchors:
            start_x = result.boardSize - columns
        if "bottom" in anchors:
            start_y = result.boardSize - rows
        if view.anchor == "center":
            start_x = (result.boardSize - columns) // 2
            start_y = (result.boardSize - rows) // 2

    stones = {
        f"{stone.x - start_x},{stone.y - start_y}": stone.color
        for stone in result.setupStones
    }
    sidecar = {
        "corners": [[float(x), float(y)] for x, y in corners],
        "board_size": result.boardSize,
        "anchor": view.anchor if view else "full",
        "rows": rows,
        "columns": columns,
        "stones": stones,
        "verified": bool(existing.get("verified")) if existing else False,
        "notes": existing.get("notes", "") if existing else "",
    }
    if existing and existing.get("stones"):
        # Preserve hand-entered stones over re-detected ones.
        sidecar["stones"] = existing["stones"]
    return sidecar


def render_overlay(photo: Path, sidecar: dict) -> None:
    from training.dataset import grid_positions

    raw = photo.read_bytes()
    corners = [tuple(point) for point in sidecar["corners"]]
    warped = _warp(_decode(raw), corners)
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY).astype("float32")
    xs, ys = grid_positions(gray, sidecar)
    vis = warped.copy()
    for key, color in sidecar["stones"].items():
        i, j = (int(v) for v in key.split(","))
        if 0 <= i < len(xs) and 0 <= j < len(ys):
            bgr = (0, 0, 255) if color == "B" else (0, 255, 0)
            cv2.circle(vis, (xs[i], ys[j]), 24, bgr, 5)
    vis = cv2.resize(vis, (720, 720))
    cv2.putText(
        vis,
        photo.stem,
        (10, 26),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 0, 0),
        2,
    )
    cv2.imwrite(str(overlay_path(photo)), vis)


def main(paths: list[str]) -> None:
    photos = (
        [Path(p) for p in paths]
        if paths
        else [Path(p) for p in sorted(glob.glob("training/corpus/*/*.jpeg"))]
    )
    for photo in photos:
        sidecar = draft_sidecar(photo)
        if sidecar is None:
            print(f"{photo}: estimation failed — add manual corners to the sidecar")
            continue
        sidecar_path(photo).write_text(json.dumps(sidecar, indent=2) + "\n")
        render_overlay(photo, sidecar)
        status = "verified" if sidecar["verified"] else "draft"
        print(
            f"{photo}: {status} {sidecar['columns']}x{sidecar['rows']}"
            f" stones={len(sidecar['stones'])}"
        )


if __name__ == "__main__":
    main(sys.argv[1:])
