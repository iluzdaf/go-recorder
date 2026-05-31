import { describe, expect, it } from "vitest";

import { toForkedLocalGameInput } from "../lib/shareFork";

describe("toForkedLocalGameInput", () => {
    it("maps a share snapshot into a local game input", () => {
        expect(
            toForkedLocalGameInput({
                slug: "share123",
                sourceKind: "game",
                boardSize: 13,
                gameState: {
                    setupStones: [{ x: 3, y: 3, color: "B" }],
                    moves: [{ type: "play", x: 4, y: 4, color: "W" }],
                    currentPlayer: "B",
                },
                blackPlayerName: "Black",
                whitePlayerName: "White",
                handicap: 2,
                createdAt: "2026-05-29T00:00:00.000Z",
            })
        ).toEqual({
            boardSize: 13,
            gameState: {
                setupStones: [{ x: 3, y: 3, color: "B" }],
                moves: [{ type: "play", x: 4, y: 4, color: "W" }],
                currentPlayer: "B",
            },
            blackPlayerName: "Black",
            whitePlayerName: "White",
            handicap: 2,
        });
    });
});
