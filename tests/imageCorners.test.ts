import { describe, expect, it } from "vitest";

import {
    clampCornerToBounds,
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
