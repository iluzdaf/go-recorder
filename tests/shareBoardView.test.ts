import { describe, expect, it } from "vitest";

import { getShareBoardPositionView } from "../lib/shareBoardView";

describe("getShareBoardPositionView", () => {
    it("uses position views for draft board shares", () => {
        expect(
            getShareBoardPositionView({
                sourceKind: "draft",
                positionView: {
                    anchor: "top-left",
                    rows: 6,
                    columns: 8,
                },
            })
        ).toEqual({
            anchor: "top-left",
            rows: 6,
            columns: 8,
        });
    });

    it("uses position views for draft variation shares", () => {
        expect(
            getShareBoardPositionView({
                sourceKind: "draft",
                positionView: {
                    anchor: "bottom-right",
                    rows: 9,
                    columns: 9,
                },
            })
        ).toEqual({
            anchor: "bottom-right",
            rows: 9,
            columns: 9,
        });
    });

    it("ignores position views for game shares", () => {
        expect(
            getShareBoardPositionView({
                sourceKind: "game",
                positionView: {
                    anchor: "top-left",
                    rows: 6,
                    columns: 8,
                },
            })
        ).toBeNull();
    });
});
