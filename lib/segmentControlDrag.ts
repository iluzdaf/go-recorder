export type SegmentCenter = Readonly<{ x: number; y: number }> | null;

// Picks the segment whose measured center is closest to the pointer. Works for
// single-row controls (all centers share a y) and wrapping grids alike; gaps,
// edges, and out-of-bounds points resolve to the nearest segment. Segments
// without a measured center (unmounted refs) are skipped. Returns -1 when no
// segment has a center.
export function nearestSegmentIndex(
    centers: readonly SegmentCenter[],
    point: Readonly<{ x: number; y: number }>
): number {
    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;

    centers.forEach((center, index) => {
        if (center === null) return;

        const dx = center.x - point.x;
        const dy = center.y - point.y;
        const distance = dx * dx + dy * dy;
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
        }
    });

    return nearestIndex;
}
