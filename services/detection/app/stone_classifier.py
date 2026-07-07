"""Learned per-intersection stone classifier (NumPy inference).

A small MLP trained on photographed book diagrams (see ``training/``)
classifies each grid intersection as empty, black, or white from a
32x32 patch. It exists because printed outlined white stones are beyond
classical per-intersection statistics; it is only consulted on
printed-page captures (see the gate in ``detection._detect_stones``)
because per-patch standardisation discards absolute brightness, which
makes dark wooden boards hallucinate whites.

Weights ship with the service as ``app/weights.npz``; retraining the
corpus (``training/train.py``) produces a drop-in replacement. Set
``LEARNED_CLASSIFIER=0`` to disable without redeploying weights.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np

PATCH = 32
WINDOW_CELL_FRAC = 1.3
WEIGHTS_PATH = Path(__file__).with_name("weights.npz")

LABELS = (None, "B", "W")


@lru_cache(maxsize=1)
def _params() -> tuple[np.ndarray, ...] | None:
    if not WEIGHTS_PATH.exists():
        return None
    data = np.load(WEIGHTS_PATH)
    return (data["W1"], data["b1"], data["W2"], data["b2"])


def enabled() -> bool:
    return os.environ.get("LEARNED_CLASSIFIER", "1") != "0" and _params() is not None


def classify(
    gray: np.ndarray, xs: list[int], ys: list[int], cell: float
) -> dict[tuple[int, int], tuple[str | None, float]]:
    """Classify every intersection; returns (label, probability) per point."""

    params = _params()
    if params is None:
        return {}
    window = int(cell * WINDOW_CELL_FRAC)
    source = gray.astype(np.float32)
    patches: list[np.ndarray] = []
    coords: list[tuple[int, int]] = []
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            x0 = max(0, x - window // 2)
            y0 = max(0, y - window // 2)
            crop = source[y0 : y0 + window, x0 : x0 + window]
            if crop.shape[0] < window // 2 or crop.shape[1] < window // 2:
                continue
            crop = cv2.resize(crop, (PATCH, PATCH))
            crop = (crop - crop.mean()) / (crop.std() + 1e-6)
            patches.append(crop.ravel())
            coords.append((i, j))
    if not patches:
        return {}
    W1, b1, W2, b2 = params
    X = np.array(patches, np.float32)
    logits = np.maximum(0, X @ W1 + b1) @ W2 + b2
    shifted = np.exp(logits - logits.max(axis=1, keepdims=True))
    probs = shifted / shifted.sum(axis=1, keepdims=True)
    classes = probs.argmax(axis=1)
    return {
        coord: (LABELS[cls], float(row[cls]))
        for coord, cls, row in zip(coords, classes, probs)
    }
