"""Ingest corrected board positions from Go Recorder share links.

Labelling flow: create a draft from a corpus photo in the app, correct the
stones in the draft editor, share it, and pass the share link here mapped to
the photo. The share's setupStones become the photo's verified sidecar
labels. Stones travel as full-board coordinates and are mapped into the
sidecar's visible grid through each side's position view, so the app and the
sidecar do not need identical corner pixels — only a consistent grid.

Run from services/detection:
    .venv/bin/python -m training.ingest_shares \
        training/corpus/Kiseido/IMG_1662.jpeg=https://<app>/shares/<slug> ...
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path


def start_offsets(anchor: str, board_size: int, rows: int, columns: int):
    def offset(side: str, visible: int) -> int:
        if side == "start":
            return 0
        if side == "end":
            return board_size - visible
        return (board_size - visible) // 2

    vertical = horizontal = "center"
    if anchor and anchor != "full" and anchor != "center":
        parts = anchor.split("-")
        for part in parts:
            if part in ("top", "bottom"):
                vertical = "start" if part == "top" else "end"
            if part in ("left", "right"):
                horizontal = "start" if part == "left" else "end"
    if anchor in ("full",):
        return 0, 0
    return offset(horizontal, columns), offset(vertical, rows)


def fetch_share(url: str) -> dict:
    slug = url.rstrip("/").split("/")[-1]
    base = url.split("/shares/")[0]
    api = f"{base}/api/shares/{slug}"
    with urllib.request.urlopen(api, timeout=30) as response:
        return json.load(response)


def ingest(photo: Path, url: str) -> None:
    sidecar_file = photo.with_suffix(".json")
    sidecar = json.loads(sidecar_file.read_text())
    share = fetch_share(url)
    record = share.get("share", share)
    board_size = record["boardSize"]
    stones = record["gameState"]["setupStones"]
    view = record.get("positionView")

    if board_size != sidecar["board_size"]:
        print(
            f"{photo}: board size mismatch (share {board_size},"
            f" sidecar {sidecar['board_size']}) — review manually"
        )
        return

    my_start_x, my_start_y = start_offsets(
        sidecar.get("anchor", "full"),
        sidecar["board_size"],
        sidecar["rows"],
        sidecar["columns"],
    )

    labelled = {}
    dropped = 0
    for stone in stones:
        i = stone["x"] - my_start_x
        j = stone["y"] - my_start_y
        if 0 <= i < sidecar["columns"] and 0 <= j < sidecar["rows"]:
            labelled[f"{i},{j}"] = stone["color"]
        else:
            dropped += 1

    sidecar["stones"] = labelled
    sidecar["verified"] = True
    sidecar["notes"] = f"Labelled via share {url}"
    if view is not None and view.get("anchor") not in (None, "full"):
        sidecar["notes"] += f" (share view {view.get('anchor')})"
    sidecar_file.write_text(json.dumps(sidecar, indent=2) + "\n")
    print(
        f"{photo}: verified with {len(labelled)} stones"
        + (f" ({dropped} outside the visible grid — check)" if dropped else "")
    )


def main(args: list[str]) -> None:
    if not args:
        print(__doc__)
        return
    for arg in args:
        photo, _, url = arg.partition("=")
        ingest(Path(photo), url)


if __name__ == "__main__":
    main(sys.argv[1:])
