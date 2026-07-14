import { describe, expect, it } from "vitest";

import { getShareBoardPlaceholderSize } from "../lib/shareBoardPlaceholder";

describe("getShareBoardPlaceholderSize", () => {
    it("reserves the full board footprint including the coordinate gutter", () => {
        const size = getShareBoardPlaceholderSize({
            columns: 19,
            rows: 19,
            showCoordinates: true,
        });

        const vertex =
            "max(16px, min((100vw - 4px) / 21, (100dvh - 4px) / 21))";
        expect(size.width).toBe(`calc(${vertex} * 21)`);
        expect(size.height).toBe(`calc(${vertex} * 21)`);
    });

    it("drops the coordinate gutter when coordinates are hidden", () => {
        const size = getShareBoardPlaceholderSize({
            columns: 9,
            rows: 9,
            showCoordinates: false,
        });

        const vertex = "max(16px, min((100vw - 4px) / 9, (100dvh - 4px) / 9))";
        expect(size.width).toBe(`calc(${vertex} * 9)`);
        expect(size.height).toBe(`calc(${vertex} * 9)`);
    });

    it("produces a non-square footprint for a cropped position view", () => {
        const size = getShareBoardPlaceholderSize({
            columns: 8,
            rows: 5,
            showCoordinates: true,
        });

        expect(size.width).toContain("* 10");
        expect(size.height).toContain("* 7");
    });
});
