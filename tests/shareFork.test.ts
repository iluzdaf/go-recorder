import { describe, expect, it } from "vitest";

import { toForkedLocalGameInput, toVariationDraftInput } from "../lib/shareFork";

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

describe("toVariationDraftInput", () => {
    it("builds a variation draft from the visible share position", () => {
        expect(
            toVariationDraftInput({
                share: {
                    slug: "share123",
                    sourceKind: "game",
                    boardSize: 13,
                    gameState: {
                        setupStones: [{ x: 3, y: 3, color: "B" }],
                        moves: [
                            { type: "play", x: 4, y: 4, color: "W" },
                            { type: "play", x: 5, y: 4, color: "B" },
                        ],
                        currentPlayer: "W",
                    },
                    blackPlayerName: "Black",
                    whitePlayerName: "White",
                    handicap: 2,
                    positionView: {
                        anchor: "top-left",
                        rows: 6,
                        columns: 8,
                    },
                    createdAt: "2026-05-29T00:00:00.000Z",
                },
                vertex: { x: 6, y: 4 },
                visibleMoveCount: 1,
            })
        ).toEqual({
            ok: true,
            input: {
                draftKind: "variation",
                boardSize: 13,
                gameState: {
                    setupStones: [{ x: 3, y: 3, color: "B" }],
                    moves: [
                        { type: "play", x: 4, y: 4, color: "W" },
                        { type: "play", x: 6, y: 4, color: "B" },
                    ],
                    currentPlayer: "W",
                },
                blackPlayerName: null,
                whitePlayerName: null,
                handicap: 0,
                parentShareSlug: "share123",
                baseMoveCount: 1,
                positionView: {
                    anchor: "top-left",
                    rows: 6,
                    columns: 8,
                },
            },
        });
    });

    it("uses the first move color when forking from the start of a replay", () => {
        const result = toVariationDraftInput({
            share: {
                slug: "share123",
                sourceKind: "game",
                boardSize: 9,
                gameState: {
                    setupStones: [],
                    moves: [{ type: "play", x: 4, y: 4, color: "W" }],
                    currentPlayer: "B",
                },
                blackPlayerName: null,
                whitePlayerName: null,
                handicap: 0,
                createdAt: "2026-05-29T00:00:00.000Z",
            },
            vertex: { x: 3, y: 3 },
            visibleMoveCount: 0,
        });

        expect(result).toMatchObject({
            ok: true,
            input: {
                gameState: {
                    moves: [{ type: "play", x: 3, y: 3, color: "W" }],
                    currentPlayer: "B",
                },
                baseMoveCount: 0,
            },
        });
    });

    it("rejects occupied proposed moves", () => {
        expect(
            toVariationDraftInput({
                share: {
                    slug: "share123",
                    sourceKind: "game",
                    boardSize: 9,
                    gameState: {
                        setupStones: [],
                        moves: [{ type: "play", x: 4, y: 4, color: "B" }],
                        currentPlayer: "W",
                    },
                    blackPlayerName: null,
                    whitePlayerName: null,
                    handicap: 0,
                    createdAt: "2026-05-29T00:00:00.000Z",
                },
                vertex: { x: 4, y: 4 },
                visibleMoveCount: 1,
            })
        ).toEqual({
            ok: false,
            error: "Overwrite prevented",
        });
    });
});
