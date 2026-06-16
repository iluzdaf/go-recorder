import type { BoardCorner } from "./boardDetection";

export type OrderedCorners = [
    BoardCorner,
    BoardCorner,
    BoardCorner,
    BoardCorner,
];

export const CORNER_LABELS = [
    "topLeft",
    "topRight",
    "bottomRight",
    "bottomLeft",
] as const;

export type CornerIndex = 0 | 1 | 2 | 3;

type Size = {
    width: number;
    height: number;
};

/**
 * Initial corner handles, inset from each edge so they are easy to grab before
 * the user drags them onto the board. Ordered top-left, top-right,
 * bottom-right, bottom-left to match the detection contract.
 */
export function createInitialCorners(
    { width, height }: Size,
    insetFraction = 0.12
): OrderedCorners {
    const inset = Math.max(0, Math.min(0.5, insetFraction));
    const left = width * inset;
    const right = width * (1 - inset);
    const top = height * inset;
    const bottom = height * (1 - inset);

    return [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
    ];
}

export function clampCornerToBounds(
    corner: BoardCorner,
    { width, height }: Size
): BoardCorner {
    return {
        x: Math.max(0, Math.min(width, corner.x)),
        y: Math.max(0, Math.min(height, corner.y)),
    };
}

export function updateCorner(
    corners: OrderedCorners,
    index: CornerIndex,
    corner: BoardCorner,
    bounds: Size
): OrderedCorners {
    const next = [...corners] as OrderedCorners;
    next[index] = clampCornerToBounds(corner, bounds);
    return next;
}

/**
 * Convert corners measured against the displayed image into the natural-pixel
 * coordinates the detection service expects.
 */
export function scaleCornersToNatural(
    corners: OrderedCorners,
    {
        displayWidth,
        displayHeight,
        naturalWidth,
        naturalHeight,
    }: {
        displayWidth: number;
        displayHeight: number;
        naturalWidth: number;
        naturalHeight: number;
    }
): OrderedCorners {
    const scaleX = displayWidth === 0 ? 0 : naturalWidth / displayWidth;
    const scaleY = displayHeight === 0 ? 0 : naturalHeight / displayHeight;

    return corners.map((corner) => ({
        x: corner.x * scaleX,
        y: corner.y * scaleY,
    })) as OrderedCorners;
}
