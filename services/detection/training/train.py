"""Train the per-intersection stone classifier and emit NumPy weights.

A deliberately tiny MLP (32x32 patch -> 64 -> 3) trained with Adam in pure
NumPy: small enough that retraining from scratch on a grown corpus takes
seconds, so "incremental training" means growing the dataset, never
warm-starting weights. Emits ``training/weights.npz`` plus a report; the
verified real stones of the book capture serve as a smoke evaluation.

Run from services/detection:
    .venv/bin/python -m training.train
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

PATCH = 32
HIDDEN = 64
CLASSES = 3
EPOCHS = 25
BATCH = 128
LEARNING_RATE = 1e-3
SEED = 20260707


def forward(params, X):
    W1, b1, W2, b2 = params
    hidden = np.maximum(0, X @ W1 + b1)
    return hidden, hidden @ W2 + b2


def main() -> None:
    rng = np.random.default_rng(SEED)
    data = np.load("training/dataset.npz", allow_pickle=True)
    X, Y, sources = data["X"], data["Y"], data["sources"]

    # Hold out whole photos, not random patches, so validation measures
    # transfer to unseen pages rather than memorised backgrounds. Verified
    # anchors (tests/data) always train: they carry the only certified
    # hard-negative empties.
    photos = sorted(
        p for p in set(sources.tolist()) if p.startswith("training/corpus")
    )
    holdout = set(photos[:: max(1, len(photos) // 3)][:3])
    val_mask = np.isin(sources, list(holdout))
    Xtr, Ytr = X[~val_mask], Y[~val_mask]
    Xva, Yva = X[val_mask], Y[val_mask]
    print("holdout photos:", sorted(holdout))
    print("train:", len(Ytr), "val:", len(Yva))

    dim = PATCH * PATCH
    params = [
        rng.normal(0, np.sqrt(2.0 / dim), (dim, HIDDEN)).astype(np.float32),
        np.zeros(HIDDEN, np.float32),
        rng.normal(0, np.sqrt(2.0 / HIDDEN), (HIDDEN, CLASSES)).astype(np.float32),
        np.zeros(CLASSES, np.float32),
    ]
    first = [np.zeros_like(p) for p in params]
    second = [np.zeros_like(p) for p in params]
    step = 0

    for epoch in range(EPOCHS):
        order = rng.permutation(len(Ytr))
        for start in range(0, len(Ytr), BATCH):
            idx = order[start : start + BATCH]
            Xb, Yb = Xtr[idx], Ytr[idx]
            hidden, logits = forward(params, Xb)
            shifted = logits - logits.max(axis=1, keepdims=True)
            exp = np.exp(shifted)
            probs = exp / exp.sum(axis=1, keepdims=True)
            dlogits = probs
            dlogits[np.arange(len(Yb)), Yb] -= 1
            dlogits /= len(Yb)
            dhidden = dlogits @ params[2].T
            dhidden[hidden <= 0] = 0
            grads = [
                Xb.T @ dhidden,
                dhidden.sum(axis=0),
                hidden.T @ dlogits,
                dlogits.sum(axis=0),
            ]
            step += 1
            for k in range(4):
                first[k] = 0.9 * first[k] + 0.1 * grads[k]
                second[k] = 0.999 * second[k] + 0.001 * grads[k] ** 2
                params[k] -= (
                    LEARNING_RATE
                    * (first[k] / (1 - 0.9**step))
                    / (np.sqrt(second[k] / (1 - 0.999**step)) + 1e-8)
                )
        _, logits = forward(params, Xva)
        accuracy = float((logits.argmax(axis=1) == Yva).mean())
        print(f"epoch {epoch}: holdout accuracy {accuracy:.3f}")

    W1, b1, W2, b2 = params
    np.savez("training/weights.npz", W1=W1, b1=b1, W2=W2, b2=b2)
    print("saved training/weights.npz")

    # Per-class holdout report.
    _, logits = forward(params, Xva)
    pred = logits.argmax(axis=1)
    names = ["empty", "black", "white"]
    for cls in range(CLASSES):
        mask = Yva == cls
        if mask.any():
            acc = float((pred[mask] == cls).mean())
            print(f"holdout {names[cls]}: {acc:.3f} over {int(mask.sum())}")


if __name__ == "__main__":
    main()
