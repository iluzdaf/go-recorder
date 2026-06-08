import { describe, expect, it } from "vitest";

import {
    getFinalPositionFromGameState,
    isValidFinalPosition,
} from "../lib/shareFinalPosition";

describe("isValidFinalPosition", () => {
    it("accepts a sign map that matches the board size", () => {
        const finalPosition = Array.from({ length: 9 }, () =>
            Array.from({ length: 9 }, () => 0)
        );
        finalPosition[2][2] = 1;
        finalPosition[3][3] = -1;

        expect(isValidFinalPosition(finalPosition, 9)).toBe(true);
    });

    it("rejects invalid signs and board dimensions", () => {
        expect(isValidFinalPosition([[2]], 9)).toBe(false);
        expect(isValidFinalPosition([[0]], 19)).toBe(false);
    });
});

describe("getFinalPositionFromGameState", () => {
    it("replays legal game state into a final sign map", () => {
        const result = getFinalPositionFromGameState({
            boardSize: 9,
            gameState: {
                setupStones: [],
                moves: [{ type: "play", x: 2, y: 2, color: "B" }],
                currentPlayer: "W",
            },
        });

        expect(result).toMatchObject({
            ok: true,
            finalPosition: expect.any(Array),
        });

        if (result.ok) {
            expect(result.finalPosition[2][2]).toBe(1);
        }
    });

    it("rejects game state that cannot replay legally", () => {
        const result = getFinalPositionFromGameState({
            boardSize: 9,
            gameState: {
                setupStones: [],
                moves: [
                    { type: "play", x: 2, y: 2, color: "B" },
                    { type: "play", x: 2, y: 2, color: "W" },
                ],
                currentPlayer: "B",
            },
        });

        expect(result).toMatchObject({
            ok: false,
            error: expect.any(String),
        });
    });
});
