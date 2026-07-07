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
ROUND_ONE_DIRS = (
    "training/corpus/Kiseido",
    "training/corpus/TGA-A",
    "training/corpus/TGA-B",
    "training/corpus/Slate-&-Shell",
)
EXTRA_PHOTOS = ("tests/data/book-flat-board.jpeg",)

rng = np.random.default_rng(20260707)


def grid_positions(gray: np.ndarray, sidecar: dict):
    """Grid line positions on the warp, honouring the sidecar's extent.

    Line detection can lock onto a half-pitch chain when dense stone rows
    add edges between the real lines. The sidecar corners sit exactly on
    the outer grid intersections, so when detection disagrees with the
    sidecar's rows/columns, the uniform lattice implied by the warp's
    padded quad is the more trustworthy source.
    """

    xs = _line_positions(gray, "vertical")
    ys = _line_positions(gray, "horizontal")
    columns, rows = sidecar.get("columns"), sidecar.get("rows")
    pad = d.WARP_SIZE * d.WARP_PAD_FRAC
    if columns and len(xs) != columns:
        xs = [int(round(v)) for v in np.linspace(pad, d.WARP_SIZE - pad, columns)]
    if rows and len(ys) != rows:
        ys = [int(round(v)) for v in np.linspace(pad, d.WARP_SIZE - pad, rows)]
    return xs, ys


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
                cv2.FONT_HERSHEY_SIMPLEX, float(rng.uniform(0.4, 0.9)),
                float(board + rng.uniform(10, 50)), int(rng.integers(1, 3)),
            )
    else:  # white: board-coloured fill, outline from faint-broken to bold
        fill = board + rng.uniform(-6, 14)
        cv2.circle(patch, (sx, sy), int(radius), float(fill), -1)
        outline = np.clip(ink + rng.uniform(-15, 80), 40, board - 20)
        arcs = rng.integers(1, 9)
        thickness = int(rng.integers(1, 5))
        for a in range(arcs):
            a0 = 360 * a / arcs + rng.uniform(0, 8)
            a1 = 360 * (a + 1) / arcs - rng.uniform(0, 14 if arcs > 1 else 1)
            cv2.ellipse(
                patch, (sx, sy), (int(radius), int(radius)), 0, a0, a1,
                float(outline), thickness,
            )
        if rng.random() < 0.5:
            cv2.putText(
                patch, str(rng.integers(1, 99)), (sx - 9, sy + 7),
                cv2.FONT_HERSHEY_SIMPLEX, float(rng.uniform(0.4, 0.9)),
                float(outline - rng.uniform(0, 30)), int(rng.integers(1, 3)),
            )
    if rng.random() < 0.5:
        patch = cv2.GaussianBlur(patch, (0, 0), rng.uniform(0.3, 0.9))
    return patch


def _snap_stone_centre(small, x, y, cell, color):
    height, width = small.shape
    rad = 0.33 * cell
    angles = np.linspace(0, 2 * np.pi, 8, endpoint=False)
    span = int(0.3 * cell)
    offsets = sorted(
        ((dx, dy) for dy in range(-span, span + 1, 3)
         for dx in range(-span, span + 1, 3)),
        key=lambda o: o[0] * o[0] + o[1] * o[1],
    )
    best = (-1e18, (x, y))
    for dx, dy in offsets:
        cx = int(np.clip(x + dx, 0, width - 1))
        cy = int(np.clip(y + dy, 0, height - 1))
        if color == "B":
            score = 255.0 - small[cy, cx]
        else:
            ring = np.mean([
                small[
                    int(np.clip(cy + rad * np.sin(a), 0, height - 1)),
                    int(np.clip(cx + rad * np.cos(a), 0, width - 1)),
                ]
                for a in angles
            ])
            score = small[cy, cx] - ring
        # centre-outward order plus a real-improvement bar keeps snaps
        # centred on the plateau of a uniform stone
        if score > best[0] + 1.5:
            best = (score, (cx, cy))
    return best[1]


def bow(patch: np.ndarray) -> np.ndarray:
    """Small sinusoidal warp: page curvature bends lines through a patch.

    Curved grid junctions — especially board corners — otherwise read as
    ring fragments and produce confident white false positives.
    """

    h, w = patch.shape
    amp = rng.uniform(0.5, 3.0)
    phase = rng.uniform(0, 2 * np.pi)
    xs, ys = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    if rng.random() < 0.5:
        ys = ys - amp * np.sin(np.pi * xs / (w - 1) + phase).astype(np.float32)
    else:
        xs = xs - amp * np.sin(np.pi * ys / (h - 1) + phase).astype(np.float32)
    return cv2.remap(
        patch, xs, ys, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE
    )


def neighbour_arc(background: np.ndarray, cell: float, ink: float) -> np.ndarray:
    """An empty point clipped by the edge of a stone one cell away.

    Edge intersections next to dense clusters see a neighbouring stone's
    arc inside their window; that arc must not read as a stone here.
    """

    patch = background.copy()
    centre = patch.shape[0] // 2
    angle = rng.uniform(0, 2 * np.pi)
    dist = rng.uniform(0.8, 1.15) * cell
    sx = int(centre + dist * np.cos(angle))
    sy = int(centre + dist * np.sin(angle))
    radius = int(rng.uniform(0.3, 0.48) * cell)
    board = float(np.median(patch))
    if rng.random() < 0.5:
        shade = np.clip(ink - rng.uniform(0, 60), 10, 140)
        cv2.circle(patch, (sx, sy), radius, float(shade), -1)
    else:
        cv2.circle(patch, (sx, sy), radius, float(board + rng.uniform(-6, 14)), -1)
        outline = np.clip(ink + rng.uniform(-15, 80), 40, board - 25)
        cv2.circle(patch, (sx, sy), radius, float(outline), int(rng.integers(1, 5)))
    if rng.random() < 0.4:
        patch = cv2.GaussianBlur(patch, (0, 0), rng.uniform(0.3, 0.9))
    return patch


def annotate_empty(background: np.ndarray, cell: float, ink: float) -> np.ndarray:
    """Bare text on an empty intersection (move numbers, coordinate labels).

    Printed diagrams mark empty points with digits and letters, and edge
    patches pick up coordinate labels printed outside the grid; both must
    read as empty, not as a labelled stone.
    """

    patch = background.copy()
    centre = patch.shape[0] // 2
    glyphs = "0123456789ABCDEFGHJKLMNOPQRSTX"
    for _ in range(int(rng.integers(1, 3))):
        text = "".join(
            glyphs[rng.integers(0, len(glyphs))]
            for _ in range(int(rng.integers(1, 3)))
        )
        ox = int(rng.uniform(-0.5, 0.5) * cell)
        oy = int(rng.uniform(-0.5, 0.5) * cell)
        cv2.putText(
            patch, text, (centre + ox - 10, centre + oy + 7),
            cv2.FONT_HERSHEY_SIMPLEX, float(rng.uniform(0.45, 0.8)),
            float(np.clip(ink + rng.uniform(-20, 30), 30, 160)),
            int(rng.integers(1, 3)),
        )
    if rng.random() < 0.4:
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
    xs, ys = grid_positions(gray, sidecar)
    cell = d._cell_size(xs, ys)
    smooth = cv2.GaussianBlur(gray, (0, 0), 3)
    window = int(cell * WINDOW_CELL_FRAC)
    ink = line_ink(gray, xs, ys)
    fallback = float(np.median(gray))
    stones = {
        tuple(int(v) for v in key.split(",")): color
        for key, color in sidecar["stones"].items()
    }
    verified = bool(sidecar.get("verified"))

    def crop_at(x, y):
        x0 = max(0, x - window // 2)
        y0 = max(0, y - window // 2)
        crop = gray[y0 : y0 + window, x0 : x0 + window]
        if crop.shape[0] < window // 2 or crop.shape[1] < window // 2:
            return None
        return crop

    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            label = stones.get((i, j))
            if label:
                # Bowed pages leave individual stones up to half a cell off
                # any lattice. Train on both views: the lattice-point patch
                # matches what inference will sample; the snapped-centre
                # patch guarantees a clean example of the stone itself.
                cls = 1 if label == "B" else 2
                for px, py in ((x, y), _snap_stone_centre(smooth, x, y, cell, label)):
                    crop = crop_at(px, py)
                    if crop is not None:
                        yield normalise(crop), cls
                continue
            crop = crop_at(x, y)
            if crop is None:
                continue
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
            yield normalise(bow(crop)), 0
            yield normalise(annotate_empty(crop, cell, ink)), 0
            yield normalise(neighbour_arc(crop, cell, ink)), 0
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
