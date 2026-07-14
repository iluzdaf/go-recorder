import { describe, expect, it } from "vitest";

import { nearestSegmentIndex } from "../lib/segmentControlDrag";

const row = [
    { x: 10, y: 0 },
    { x: 30, y: 0 },
    { x: 50, y: 0 },
];

describe("segment control drag helpers", () => {
    it("selects the segment whose center is nearest the pointer", () => {
        expect(nearestSegmentIndex(row, { x: 8, y: 0 })).toBe(0);
        expect(nearestSegmentIndex(row, { x: 28, y: 0 })).toBe(1);
        expect(nearestSegmentIndex(row, { x: 52, y: 0 })).toBe(2);
    });

    it("resolves gaps and edges to the nearest segment", () => {
        expect(nearestSegmentIndex(row, { x: -100, y: 0 })).toBe(0);
        expect(nearestSegmentIndex(row, { x: 100, y: 0 })).toBe(2);
        expect(nearestSegmentIndex(row, { x: 21, y: 0 })).toBe(1);
    });

    it("keeps the lower index when two centers are equidistant", () => {
        expect(
            nearestSegmentIndex(
                [
                    { x: 10, y: 0 },
                    { x: 30, y: 0 },
                ],
                { x: 20, y: 0 }
            )
        ).toBe(0);
    });

    it("uses vertical distance to pick between rows of a wrapping grid", () => {
        const grid = [
            { x: 10, y: 0 },
            { x: 30, y: 0 },
            { x: 10, y: 40 },
            { x: 30, y: 40 },
        ];

        expect(nearestSegmentIndex(grid, { x: 12, y: 2 })).toBe(0);
        expect(nearestSegmentIndex(grid, { x: 12, y: 38 })).toBe(2);
        expect(nearestSegmentIndex(grid, { x: 28, y: 38 })).toBe(3);
    });

    it("skips segments without a measured center", () => {
        expect(
            nearestSegmentIndex([null, { x: 30, y: 0 }, null], { x: 5, y: 0 })
        ).toBe(1);
        expect(nearestSegmentIndex([null, null], { x: 5, y: 0 })).toBe(-1);
        expect(nearestSegmentIndex([], { x: 5, y: 0 })).toBe(-1);
    });
});
