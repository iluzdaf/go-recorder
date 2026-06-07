import { describe, expect, it } from "vitest";

import {
    createVariationMoveNumberMarkerMap,
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

describe("createVariationMoveNumberMarkerMap", () => {
    it("labels visible play moves by move number", () => {
        expect(
            createVariationMoveNumberMarkerMap({
                boardSize: 9,
                moves: [
                    { type: "play", x: 3, y: 3, color: "B" },
                    { type: "pass", color: "W" },
                    { type: "play", x: 4, y: 4, color: "B" },
                ],
                signMap: [
                    [0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 1, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 1, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0, 0],
                ],
            })
        ).toMatchObject({
            3: { 3: { type: "label", label: "1" } },
            4: { 4: { type: "label", label: "3" } },
        });
    });

    it("does not label captured moves on empty intersections", () => {
        const markerMap = createVariationMoveNumberMarkerMap({
            boardSize: 9,
            moves: [{ type: "play", x: 3, y: 3, color: "B" }],
            signMap: [
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
        });

        expect(markerMap[3][3]).toBeNull();
    });

    it("can label only moves after a base move index", () => {
        const markerMap = createVariationMoveNumberMarkerMap({
            boardSize: 9,
            moves: [
                { type: "play", x: 3, y: 3, color: "B" },
                { type: "play", x: 4, y: 4, color: "W" },
            ],
            signMap: [
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 1, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, -1, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            startMoveIndex: 1,
        });

        expect(markerMap[3][3]).toBeNull();
        expect(markerMap[4][4]).toEqual({
            type: "label",
            label: "2",
        });
    });
});
