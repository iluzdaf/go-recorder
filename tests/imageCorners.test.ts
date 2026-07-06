import { describe, expect, it } from "vitest";

import {
    clampCornerToBounds,
    computeCornerMagnifier,
    cornersFromNatural,
    cornerToDisplay,
    createInitialCorners,
    scaleCornersToNatural,
    updateCorner,
} from "../lib/imageCorners";

describe("createInitialCorners", () => {
    it("insets fractional handles from each edge in TL, TR, BR, BL order", () => {
        expect(createInitialCorners(0.1)).toEqual([
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.9 },
            { x: 0.1, y: 0.9 },
        ]);
    });
});

describe("clampCornerToBounds", () => {
    it("clamps fractions to the 0..1 range", () => {
        expect(clampCornerToBounds({ x: -0.5, y: 2 })).toEqual({ x: 0, y: 1 });
    });
});

describe("updateCorner", () => {
    it("replaces a single clamped corner without mutating the input", () => {
        const corners = createInitialCorners();
        const next = updateCorner(corners, 1, { x: 9, y: -1 });

        expect(next[1]).toEqual({ x: 1, y: 0 });
        expect(next).not.toBe(corners);
        expect(corners[1]).not.toEqual(next[1]);
    });
});

describe("cornerToDisplay", () => {
    it("maps a fraction to pixels within the rendered box", () => {
        expect(
            cornerToDisplay({ x: 0.25, y: 0.5 }, { width: 400, height: 200 })
        ).toEqual({ x: 100, y: 100 });
    });
});

describe("scaleCornersToNatural", () => {
    it("scales fractions to natural pixels", () => {
        const corners = createInitialCorners(0.1);
        const natural = scaleCornersToNatural(corners, {
            naturalWidth: 1000,
            naturalHeight: 500,
        });

        expect(natural).toEqual([
            { x: 100, y: 50 },
            { x: 900, y: 50 },
            { x: 900, y: 450 },
            { x: 100, y: 450 },
        ]);
    });
});

describe("cornersFromNatural", () => {
    it("converts natural pixels into clamped fractions", () => {
        const fractions = cornersFromNatural(
            [
                { x: 100, y: 50 },
                { x: 900, y: 50 },
                { x: 1100, y: 450 },
                { x: -20, y: 450 },
            ],
            { naturalWidth: 1000, naturalHeight: 500 }
        );

        expect(fractions).toEqual([
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 1, y: 0.9 },
            { x: 0, y: 0.9 },
        ]);
    });

    it("rejects wrong corner counts and empty dimensions", () => {
        expect(
            cornersFromNatural([{ x: 1, y: 1 }], {
                naturalWidth: 100,
                naturalHeight: 100,
            })
        ).toBeNull();
        expect(
            cornersFromNatural(
                [
                    { x: 0, y: 0 },
                    { x: 1, y: 0 },
                    { x: 1, y: 1 },
                    { x: 0, y: 1 },
                ],
                { naturalWidth: 0, naturalHeight: 100 }
            )
        ).toBeNull();
    });
});

describe("computeCornerMagnifier", () => {
    const imageBox = { left: 20, top: 40, width: 400, height: 300 };

    it("centers the window on the corner and floats it above the handle", () => {
        const layout = computeCornerMagnifier(
            { x: 0.5, y: 0.5 },
            imageBox,
            { size: 100, zoom: 3, gap: 24 }
        );

        // Corner sits at (220, 190) in container space.
        expect(layout.left).toBe(220 - 50);
        expect(layout.top).toBe(190 - 24 - 100);
        expect(layout.size).toBe(100);
    });

    it("positions the zoomed image so the corner sits at the window centre", () => {
        const layout = computeCornerMagnifier(
            { x: 0.25, y: 0.5 },
            imageBox,
            { size: 100, zoom: 3, gap: 24 }
        );

        // Corner is at (100, 150) within the image; zoomed 3x it must land
        // at the 50px window centre.
        expect(layout.imageLeft).toBe(50 - 100 * 3);
        expect(layout.imageTop).toBe(50 - 150 * 3);
        expect(layout.imageWidth).toBe(1200);
        expect(layout.imageHeight).toBe(900);
    });

    it("clamps the window inside the image box horizontally", () => {
        const atLeftEdge = computeCornerMagnifier(
            { x: 0, y: 0.5 },
            imageBox,
            { size: 100, zoom: 3, gap: 24 }
        );
        const atRightEdge = computeCornerMagnifier(
            { x: 1, y: 0.5 },
            imageBox,
            { size: 100, zoom: 3, gap: 24 }
        );

        expect(atLeftEdge.left).toBe(imageBox.left);
        expect(atRightEdge.left).toBe(imageBox.left + imageBox.width - 100);
    });

    it("flips below the handle when the window would leave the container top", () => {
        const layout = computeCornerMagnifier(
            { x: 0.5, y: 0 },
            imageBox,
            { size: 100, zoom: 3, gap: 24 }
        );

        expect(layout.top).toBe(imageBox.top + 0 + 24);
    });

    it("centers the window when the image is narrower than the window", () => {
        const narrow = { left: 10, top: 40, width: 60, height: 300 };
        const layout = computeCornerMagnifier({ x: 0.5, y: 0.5 }, narrow, {
            size: 100,
            zoom: 3,
            gap: 24,
        });

        expect(layout.left).toBe(10 + (60 - 100) / 2);
    });
});
