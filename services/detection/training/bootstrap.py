"""Render the classifier's predictions over corpus photos for review.

For each photo with a sidecar, classifies every intersection with the
trained weights and writes a ``.pred.png`` overlay: red = black, green =
white. Reviewers correct mistakes; corrections update the sidecars, which
retraining then consumes.

Run from services/detection:
    .venv/bin/python -m training.bootstrap [photo ...]
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
from training.dataset import (  # noqa: E402
    PATCH,
    WINDOW_CELL_FRAC,
    grid_positions,
    normalise,
)


def predict_photo(photo: Path, params):
    sidecar = json.loads(photo.with_suffix(".json").read_text())
    raw = photo.read_bytes()
    corners = [tuple(p) for p in sidecar["corners"]]
    warped = _warp(_decode(raw), corners)
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY).astype(np.float32)
    xs, ys = grid_positions(gray, sidecar)
    cell = d._cell_size(xs, ys)
    window = int(cell * WINDOW_CELL_FRAC)

    patches, coords = [], []
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            x0 = max(0, x - window // 2)
            y0 = max(0, y - window // 2)
            crop = gray[y0 : y0 + window, x0 : x0 + window]
            if crop.shape[0] < window // 2 or crop.shape[1] < window // 2:
                continue
            patches.append(normalise(crop).ravel())
            coords.append((i, j))
    X = np.array(patches, np.float32)
    W1, b1, W2, b2 = params
    hidden = np.maximum(0, X @ W1 + b1)
    pred = (hidden @ W2 + b2).argmax(axis=1)
    return warped, xs, ys, {c: int(p) for c, p in zip(coords, pred)}


def main(paths: list[str]) -> None:
    weights = np.load("training/weights.npz")
    params = [weights["W1"], weights["b1"], weights["W2"], weights["b2"]]
    photos = (
        [Path(p) for p in paths]
        if paths
        else [
            Path(p)
            for p in sorted(glob.glob("training/corpus/*/*.jpeg"))
            if Path(p).with_suffix(".json").exists()
        ]
    )
    for photo in photos:
        warped, xs, ys, pred = predict_photo(photo, params)
        vis = warped.copy()
        blacks = whites = 0
        for (i, j), cls in pred.items():
            if cls == 0:
                continue
            bgr = (0, 0, 255) if cls == 1 else (0, 255, 0)
            cv2.circle(vis, (xs[i], ys[j]), 24, bgr, 5)
            blacks += cls == 1
            whites += cls == 2
        vis = cv2.resize(vis, (720, 720))
        cv2.putText(
            vis, photo.stem, (10, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2
        )
        out = photo.with_suffix(".pred.png")
        cv2.imwrite(str(out), vis)
        print(f"{photo}: model B={blacks} W={whites} -> {out.name}")


if __name__ == "__main__":
    main(sys.argv[1:])
