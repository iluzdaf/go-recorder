import type { BoardCorner } from "./boardDetection";

export type OrderedCorners = [
    BoardCorner,
    BoardCorner,
    BoardCorner,
    BoardCorner,
];

export type CornerIndex = 0 | 1 | 2 | 3;

type Size = {
    width: number;
    height: number;
};

function clampFraction(value: number) {
    return Math.max(0, Math.min(1, value));
}

/**
 * Initial corner handles as fractions of the image (0..1), inset from each edge
 * so they are easy to grab. Ordered top-left, top-right, bottom-right,
 * bottom-left to match the detection contract. Fractions stay correct as the
 * image is resized.
 */
export function createInitialCorners(insetFraction = 0.12): OrderedCorners {
    const inset = Math.max(0, Math.min(0.5, insetFraction));
    const low = inset;
    const high = 1 - inset;

    return [
        { x: low, y: low },
        { x: high, y: low },
        { x: high, y: high },
        { x: low, y: high },
    ];
}

export function clampCornerToBounds(corner: BoardCorner): BoardCorner {
    return {
        x: clampFraction(corner.x),
        y: clampFraction(corner.y),
    };
}

export function updateCorner(
    corners: OrderedCorners,
    index: CornerIndex,
    corner: BoardCorner
): OrderedCorners {
    const next = [...corners] as OrderedCorners;
    next[index] = clampCornerToBounds(corner);
    return next;
}

/** Position of a fractional corner within a rendered image box, in pixels. */
export function cornerToDisplay(corner: BoardCorner, { width, height }: Size) {
    return {
        x: corner.x * width,
        y: corner.y * height,
    };
}

/**
 * Convert fractional corners into the natural-pixel coordinates the detection
 * service expects.
 */
export function scaleCornersToNatural(
    corners: OrderedCorners,
    {
        naturalWidth,
        naturalHeight,
    }: {
        naturalWidth: number;
        naturalHeight: number;
    }
): OrderedCorners {
    return corners.map((corner) => ({
        x: corner.x * naturalWidth,
        y: corner.y * naturalHeight,
    })) as OrderedCorners;
}
