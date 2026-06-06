import { describe, expect, it } from "vitest";

import {
    clampActionBarDragX,
    getActionBarAnchorFromBounds,
    isActionBarAnchor,
} from "../lib/actionBarDrag";

describe("action bar drag helpers", () => {
    it("recognizes persisted action bar anchors", () => {
        expect(isActionBarAnchor("left")).toBe(true);
        expect(isActionBarAnchor("right")).toBe(true);
        expect(isActionBarAnchor("center")).toBe(false);
        expect(isActionBarAnchor(null)).toBe(false);
    });

    it("keeps the left anchor when the bar stays left of the midpoint", () => {
        expect(
            getActionBarAnchorFromBounds({
                bar: { left: 8, right: 50 },
                currentAnchor: "left",
                rail: { left: 0, width: 100 },
            })
        ).toBe("left");
    });

    it("switches from left to right when any bar edge crosses the midpoint", () => {
        expect(
            getActionBarAnchorFromBounds({
                bar: { left: 8, right: 51 },
                currentAnchor: "left",
                rail: { left: 0, width: 100 },
            })
        ).toBe("right");
    });

    it("keeps the right anchor when the bar stays right of the midpoint", () => {
        expect(
            getActionBarAnchorFromBounds({
                bar: { left: 50, right: 92 },
                currentAnchor: "right",
                rail: { left: 0, width: 100 },
            })
        ).toBe("right");
    });

    it("switches from right to left when any bar edge crosses the midpoint", () => {
        expect(
            getActionBarAnchorFromBounds({
                bar: { left: 49, right: 92 },
                currentAnchor: "right",
                rail: { left: 0, width: 100 },
            })
        ).toBe("left");
    });

    it("clamps drag positions to the rail", () => {
        expect(
            clampActionBarDragX({ barWidth: 30, railWidth: 100, x: -20 })
        ).toBe(0);
        expect(
            clampActionBarDragX({ barWidth: 30, railWidth: 100, x: 40 })
        ).toBe(40);
        expect(
            clampActionBarDragX({ barWidth: 30, railWidth: 100, x: 90 })
        ).toBe(70);
    });
});
