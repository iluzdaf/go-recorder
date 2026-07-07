"""Build the training set: real backgrounds + composited stones.

Reads corpus photos with sidecars, extracts a patch per intersection, and
labels patches as empty (real background), black, or white. Stone positives
are synthesised by compositing a stone onto a real background patch, with
ink darkness sampled from the image's own grid lines — the probe showed real
backgrounds are what make the model transfer, while purely synthetic paper
does not. Real stones from sidecars are included as positives; intersections
that look ring-like but are unlabelled are excluded from backgrounds rather
than risk training a real (unverified) stone as empty.

Run from services/detection:
    .venv/bin/python -m training.dataset
"""

from __future__ import annotations

import glob
import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import detection as d  # noqa: E402
from app.detection import _decode, _line_positions, _warp  # noqa: E402

PATCH = 32
WINDOW_CELL_FRAC = 1.3
COMPOSITES_PER_BACKGROUND = 2
ROUND_ONE_DIRS = ("training/corpus/Kiseido", "training/corpus/TGA-A")
EXTRA_PHOTOS = ("tests/data/book-flat-board.jpeg",)

rng = np.random.default_rng(20260707)


def normalise(patch: np.ndarray) -> np.ndarray:
    patch = cv2.resize(patch, (PATCH, PATCH))
    return (patch - patch.mean()) / (patch.std() + 1e-6)


def line_ink(gray: np.ndarray, xs: list[int], ys: list[int]) -> float:
    """Median brightness of the grid lines between crossings."""

    samples = []
    for j in range(0, len(ys), max(1, len(ys) // 5)):
        for i in range(len(xs) - 1):
            samples.append(float(gray[ys[j], (xs[i] + xs[i + 1]) // 2]))
    return float(np.median(samples)) if samples else 100.0


def composite(background: np.ndarray, cls: int, cell: float, ink: float) -> np.ndarray:
    patch = background.copy()
    centre = patch.shape[0] // 2
    ox = int(rng.uniform(-0.12, 0.12) * cell)
    oy = int(rng.uniform(-0.12, 0.12) * cell)
    sx, sy = centre + ox, centre + oy
    radius = rng.uniform(0.26, 0.44) * cell
    board = float(np.median(patch))
    if cls == 1:  # black: solid dark disc around the measured ink level
        shade = np.clip(ink - rng.uniform(0, 60), 10, 140)
        cv2.circle(patch, (sx, sy), int(radius), float(shade), -1)
        if rng.random() < 0.3:
            cv2.putText(
                patch, str(rng.integers(1, 99)), (sx - 9, sy + 6),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, float(board + rng.uniform(10, 50)), 1,
            )
    else:  # white: board-coloured fill, faint possibly broken outline
        fill = board + rng.uniform(-6, 14)
        cv2.circle(patch, (sx, sy), int(radius), float(fill), -1)
        outline = np.clip(ink + rng.uniform(-15, 40), 40, board - 20)
        arcs = rng.integers(4, 9)
        for a in range(arcs):
            a0 = 360 * a / arcs + rng.uniform(0, 8)
            a1 = 360 * (a + 1) / arcs - rng.uniform(0, 14)
            cv2.ellipse(
                patch, (sx, sy), (int(radius), int(radius)), 0, a0, a1,
                float(outline), int(rng.integers(1, 3)),
            )
        if rng.random() < 0.5:
            cv2.putText(
                patch, str(rng.integers(1, 99)), (sx - 9, sy + 7),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, float(outline - rng.uniform(0, 30)), 2,
            )
    if rng.random() < 0.5:
        patch = cv2.GaussianBlur(patch, (0, 0), rng.uniform(0.3, 0.9))
    return patch


def suspect_white(gray, x, y, cell, background) -> bool:
    coverage = d._ring_coverage(gray, x, y, cell, background - d.RING_DARK_DELTA)
    return coverage > d.RING_COVERAGE_THRESHOLD


def photo_patches(photo: Path):
    sidecar_file = photo.with_suffix(".json")
    if not sidecar_file.exists():
        return
    sidecar = json.loads(sidecar_file.read_text())
    raw = photo.read_bytes()
    corners = [tuple(p) for p in sidecar["corners"]]
    gray = cv2.cvtColor(_warp(_decode(raw), corners), cv2.COLOR_BGR2GRAY).astype(
        np.float32
    )
    xs = _line_positions(gray, "vertical")
    ys = _line_positions(gray, "horizontal")
    cell = d._cell_size(xs, ys)
    window = int(cell * WINDOW_CELL_FRAC)
    ink = line_ink(gray, xs, ys)
    fallback = float(np.median(gray))
    stones = {
        tuple(int(v) for v in key.split(",")): color
        for key, color in sidecar["stones"].items()
    }
    verified = bool(sidecar.get("verified"))

    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            x0 = max(0, x - window // 2)
            y0 = max(0, y - window // 2)
            crop = gray[y0 : y0 + window, x0 : x0 + window]
            if crop.shape[0] < window // 2 or crop.shape[1] < window // 2:
                continue
            label = stones.get((i, j))
            if label == "B":
                yield normalise(crop), 1
            elif label == "W":
                yield normalise(crop), 2
            else:
                background = (
                    d._local_background(
                        gray, xs, ys, i, j,
                        max(2, int(cell * d.BACKGROUND_RADIUS_FRAC)),
                    )
                    or fallback
                )
                if not verified and suspect_white(gray, x, y, cell, background):
                    # Unlabelled but ring-like on an unverified photo: exclude
                    # rather than risk training a real stone as empty. On a
                    # verified photo every non-stone intersection is certified
                    # empty — including ring-like paper noise, which the model
                    # must learn to reject.
                    continue
                yield normalise(crop), 0
                for _ in range(COMPOSITES_PER_BACKGROUND):
                    yield normalise(composite(crop, 1, cell, ink)), 1
                    yield normalise(composite(crop, 2, cell, ink)), 2


def main() -> None:
    photos = [
        Path(p)
        for directory in ROUND_ONE_DIRS
        for p in sorted(glob.glob(f"{directory}/*.jpeg"))
    ] + [Path(p) for p in EXTRA_PHOTOS]
    X, Y, sources = [], [], []
    for photo in photos:
        count = 0
        for patch, label in photo_patches(photo) or ():
            X.append(patch.ravel())
            Y.append(label)
            sources.append(str(photo))
            count += 1
        print(f"{photo}: {count} patches")
    X = np.array(X, np.float32)
    Y = np.array(Y, np.int64)
    print("total:", len(Y), "counts:", np.bincount(Y))
    np.savez_compressed(
        "training/dataset.npz", X=X, Y=Y, sources=np.array(sources)
    )
    print("saved training/dataset.npz")


if __name__ == "__main__":
    main()
