import { describe, expect, it } from "vitest";

import { nearestSegmentIndex } from "../lib/segmentControlDrag";

describe("segment control drag helpers", () => {
    it("selects the segment whose center is nearest the pointer", () => {
        const centers = [10, 30, 50];

        expect(nearestSegmentIndex(centers, 8)).toBe(0);
        expect(nearestSegmentIndex(centers, 28)).toBe(1);
        expect(nearestSegmentIndex(centers, 52)).toBe(2);
    });

    it("resolves gaps and edges to the nearest segment", () => {
        const centers = [10, 30, 50];

        expect(nearestSegmentIndex(centers, -100)).toBe(0);
        expect(nearestSegmentIndex(centers, 100)).toBe(2);
        expect(nearestSegmentIndex(centers, 21)).toBe(1);
    });

    it("keeps the lower index when two centers are equidistant", () => {
        expect(nearestSegmentIndex([10, 30], 20)).toBe(0);
    });

    it("skips segments without a measured center", () => {
        expect(nearestSegmentIndex([null, 30, null], 5)).toBe(1);
        expect(nearestSegmentIndex([null, null], 5)).toBe(-1);
        expect(nearestSegmentIndex([], 5)).toBe(-1);
    });
});
