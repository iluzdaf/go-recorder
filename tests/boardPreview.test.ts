import { describe, expect, it } from "vitest";

import type { FinalPosition } from "../components/types";
import { getBoardPreviewModel, getStarPoints } from "../lib/boardPreview";

function emptyBoard(size: number): FinalPosition {
    return Array.from({ length: size }, () =>
        Array.from({ length: size }, () => 0 as -1 | 0 | 1)
    );
}

describe("getStarPoints", () => {
    it("returns the star points for each supported board size", () => {
        expect(getStarPoints(19)).toHaveLength(9);
        expect(getStarPoints(19)).toContainEqual([9, 9]);
        expect(getStarPoints(13)).toContainEqual([6, 6]);
        expect(getStarPoints(9)).toContainEqual([4, 4]);
    });
});

describe("getBoardPreviewModel", () => {
    it("returns visible stones (board coords), star points, and the last move", () => {
        const finalPosition = emptyBoard(9);
        finalPosition[2][2] = 1;
        finalPosition[6][6] = -1;

        const model = getBoardPreviewModel({
            boardSize: 9,
            finalPosition,
            gameState: {
                setupStones: [],
                moves: [
                    { type: "play", x: 2, y: 2, color: "B" },
                    { type: "play", x: 6, y: 6, color: "W" },
                ],
                currentPlayer: "B",
            },
        });

        expect(model.visibleColumns).toBe(9);
        expect(model.startX).toBe(0);
        expect(model.stones).toContainEqual({ x: 2, y: 2, sign: 1 });
        expect(model.stones).toContainEqual({
            x: 6,
            y: 6,
            sign: -1,
            lastMove: true,
        });
        expect(model.starPoints).toContainEqual({ x: 4, y: 4 });
    });

    it("crops to the position view and labels variation moves", () => {
        const finalPosition = emptyBoard(9);
        finalPosition[0][0] = 1;
        finalPosition[1][1] = -1;

        const model = getBoardPreviewModel({
            boardSize: 9,
            finalPosition,
            draftKind: "variation",
            baseMoveCount: 0,
            positionView: { anchor: "top-left", rows: 3, columns: 3 },
            gameState: {
                setupStones: [],
                moves: [
                    { type: "play", x: 0, y: 0, color: "B" },
                    { type: "play", x: 1, y: 1, color: "W" },
                ],
                currentPlayer: "B",
            },
        });

        expect(model.visibleColumns).toBe(3);
        expect(model.visibleRows).toBe(3);
        expect(model.stones).toContainEqual({ x: 0, y: 0, sign: 1, label: "1" });
        expect(model.stones).toContainEqual({ x: 1, y: 1, sign: -1, label: "2" });
        // Variation previews do not flag a last move.
        expect(model.stones.every((stone) => !stone.lastMove)).toBe(true);
    });

    it("replays the final position when none is provided", () => {
        const model = getBoardPreviewModel({
            boardSize: 9,
            gameState: {
                setupStones: [],
                moves: [{ type: "play", x: 4, y: 4, color: "B" }],
                currentPlayer: "W",
            },
        });

        expect(model.stones).toContainEqual({ x: 4, y: 4, sign: 1, lastMove: true });
    });
});
