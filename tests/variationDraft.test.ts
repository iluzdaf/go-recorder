import { describe, expect, it } from "vitest";

import {
    playVariationDraftMove,
    undoVariationDraftMove,
} from "../lib/variationDraft";

describe("playVariationDraftMove", () => {
    it("plays legal alternating variation moves", () => {
        const first = playVariationDraftMove({
            boardSize: 9,
            gameState: {
                setupStones: [],
                moves: [],
                currentPlayer: "B",
            },
            vertex: { x: 4, y: 4 },
        });

        expect(first).toEqual({
            ok: true,
            gameState: {
                setupStones: [],
                moves: [{ type: "play", x: 4, y: 4, color: "B" }],
                currentPlayer: "W",
            },
        });

        if (!first.ok) throw new Error("Expected first move to be legal");

        expect(
            playVariationDraftMove({
                boardSize: 9,
                gameState: first.gameState,
                vertex: { x: 5, y: 4 },
            })
        ).toEqual({
            ok: true,
            gameState: {
                setupStones: [],
                moves: [
                    { type: "play", x: 4, y: 4, color: "B" },
                    { type: "play", x: 5, y: 4, color: "W" },
                ],
                currentPlayer: "B",
            },
        });
    });

    it("rejects illegal occupied moves", () => {
        expect(
            playVariationDraftMove({
                boardSize: 9,
                gameState: {
                    setupStones: [],
                    moves: [{ type: "play", x: 4, y: 4, color: "B" }],
                    currentPlayer: "W",
                },
                vertex: { x: 4, y: 4 },
            })
        ).toEqual({
            ok: false,
            error: "Overwrite prevented",
        });
    });
});

describe("undoVariationDraftMove", () => {
    it("removes only moves after the variation base", () => {
        const gameState = {
            setupStones: [],
            moves: [
                { type: "play" as const, x: 3, y: 3, color: "B" as const },
                { type: "play" as const, x: 4, y: 4, color: "W" as const },
            ],
            currentPlayer: "B" as const,
        };

        expect(
            undoVariationDraftMove({
                baseMoveCount: 1,
                gameState,
            })
        ).toEqual({
            setupStones: [],
            moves: [{ type: "play", x: 3, y: 3, color: "B" }],
            currentPlayer: "W",
        });
    });

    it("is a no-op at the variation base", () => {
        const gameState = {
            setupStones: [],
            moves: [{ type: "play" as const, x: 3, y: 3, color: "B" as const }],
            currentPlayer: "W" as const,
        };

        expect(
            undoVariationDraftMove({
                baseMoveCount: 1,
                gameState,
            })
        ).toBe(gameState);
    });
});
