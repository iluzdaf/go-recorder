"""Uniform-grid fitting that regularizes noisy detected lines."""

from __future__ import annotations

from app.detection import _fit_grid


def _uniform(count: int, spacing: int = 36, start: int = 20) -> list[int]:
    return [start + i * spacing for i in range(count)]


def test_keeps_a_clean_grid():
    assert _fit_grid(_uniform(19)) == _uniform(19)


def test_snaps_an_extra_line_down_to_a_valid_count():
    # Slightly over-marked corners enclose 20 uniform lines; a 19-board cannot
    # have 20 lines, so the fit keeps 19 aligned lines (no stretching).
    grid = _fit_grid(_uniform(20))
    assert len(grid) == 19
    spacings = [b - a for a, b in zip(grid, grid[1:])]
    assert max(spacings) - min(spacings) <= 1


def test_ignores_a_doubled_line():
    peaks = sorted(_uniform(19) + [20 + 4 * 36 + 6])  # a duplicate near one line
    grid = _fit_grid(peaks)
    assert len(grid) == 19


def test_interpolates_a_line_hidden_under_a_stone():
    peaks = _uniform(19)
    missing = peaks.pop(9)  # a middle line is not detected
    grid = _fit_grid(peaks)
    assert len(grid) == 19
    assert any(abs(value - missing) <= 2 for value in grid)


def test_preserves_a_small_partial_grid():
    assert len(_fit_grid(_uniform(8))) == 8


def test_keeps_a_13_line_grid():
    assert len(_fit_grid(_uniform(13))) == 13
