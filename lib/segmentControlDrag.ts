export type SegmentCenter = number | null;

export function nearestSegmentIndex(
    centers: readonly SegmentCenter[],
    clientX: number
): number {
    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;

    centers.forEach((center, index) => {
        if (center === null) return;

        const distance = Math.abs(center - clientX);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
        }
    });

    return nearestIndex;
}
