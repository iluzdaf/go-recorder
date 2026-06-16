import { describe, expect, it } from "vitest";

import {
    clampCornerToBounds,
    createInitialCorners,
    scaleCornersToNatural,
    updateCorner,
} from "../lib/imageCorners";

describe("createInitialCorners", () => {
    it("insets the handles from each edge in TL, TR, BR, BL order", () => {
        const corners = createInitialCorners({ width: 100, height: 200 }, 0.1);

        expect(corners).toEqual([
            { x: 10, y: 20 },
            { x: 90, y: 20 },
            { x: 90, y: 180 },
            { x: 10, y: 180 },
        ]);
    });
});

describe("clampCornerToBounds", () => {
    it("clamps to the image bounds", () => {
        expect(
            clampCornerToBounds({ x: -5, y: 250 }, { width: 100, height: 200 })
        ).toEqual({ x: 0, y: 200 });
    });
});

describe("updateCorner", () => {
    it("replaces a single clamped corner without mutating the input", () => {
        const corners = createInitialCorners({ width: 100, height: 100 });
        const next = updateCorner(
            corners,
            1,
            { x: 999, y: -10 },
            { width: 100, height: 100 }
        );

        expect(next[1]).toEqual({ x: 100, y: 0 });
        expect(next).not.toBe(corners);
        expect(corners[1]).not.toEqual(next[1]);
    });
});

describe("scaleCornersToNatural", () => {
    it("scales display coordinates to natural pixels", () => {
        const corners = createInitialCorners({ width: 100, height: 100 }, 0.1);
        const natural = scaleCornersToNatural(corners, {
            displayWidth: 100,
            displayHeight: 100,
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

    it("avoids division by zero for an unmeasured image", () => {
        const corners = createInitialCorners({ width: 100, height: 100 });
        const natural = scaleCornersToNatural(corners, {
            displayWidth: 0,
            displayHeight: 0,
            naturalWidth: 1000,
            naturalHeight: 1000,
        });

        expect(natural.every((corner) => corner.x === 0 && corner.y === 0)).toBe(true);
    });
});
