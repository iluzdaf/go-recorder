import { describe, expect, it } from "vitest";

import {
    getPositionViewDisplaySize,
    getPositionViewRange,
    getVertexFromPositionViewPointer,
    isValidPositionView,
    sanitizePositionView,
} from "../lib/positionView";

describe("position view helpers", () => {
    it("defaults missing or full views to the full board", () => {
        expect(
            getPositionViewRange({
                boardSize: 19,
                positionView: null,
            })
        ).toBeNull();
        expect(
            getPositionViewRange({
                boardSize: 19,
                positionView: {
                    anchor: "full",
                    rows: 19,
                    columns: 19,
                },
            })
        ).toBeNull();
    });

    it("computes corner and side ranges", () => {
        expect(
            getPositionViewRange({
                boardSize: 19,
                positionView: {
                    anchor: "top-left",
                    rows: 6,
                    columns: 8,
                },
            })
        ).toMatchObject({
            rangeX: [0, 7],
            rangeY: [0, 5],
            startX: 0,
            startY: 0,
        });
        expect(
            getPositionViewRange({
                boardSize: 19,
                positionView: {
                    anchor: "right",
                    rows: 7,
                    columns: 5,
                },
            })
        ).toMatchObject({
            rangeX: [14, 18],
            rangeY: [6, 12],
            startX: 14,
            startY: 6,
        });
    });

    it("computes centered ranges and display size", () => {
        expect(
            getPositionViewRange({
                boardSize: 19,
                positionView: {
                    anchor: "center",
                    rows: 8,
                    columns: 6,
                },
            })
        ).toMatchObject({
            rangeX: [6, 11],
            rangeY: [5, 12],
        });
        expect(
            getPositionViewDisplaySize({
                boardSize: 19,
                positionView: {
                    anchor: "center",
                    rows: 8,
                    columns: 6,
                },
            })
        ).toBe(8);
    });

    it("validates and sanitizes stored values", () => {
        expect(
            isValidPositionView(
                {
                    anchor: "bottom",
                    rows: 6,
                    columns: 7,
                },
                19
            )
        ).toBe(true);
        expect(
            sanitizePositionView(
                {
                    anchor: "bottom",
                    rows: 1,
                    columns: 7,
                },
                19
            )
        ).toBeNull();
        expect(
            sanitizePositionView(
                {
                    anchor: "invalid",
                    rows: 6,
                    columns: 7,
                },
                19
            )
        ).toBeNull();
    });

    it("maps cropped pointer coordinates back to full-board vertices", () => {
        expect(
            getVertexFromPositionViewPointer({
                clientX: 125,
                clientY: 145,
                grid: {
                    left: 100,
                    top: 120,
                    cellSize: 20,
                    rows: 6,
                    columns: 8,
                    startX: 11,
                    startY: 13,
                },
            })
        ).toEqual({
            x: 12,
            y: 14,
        });
    });
});
