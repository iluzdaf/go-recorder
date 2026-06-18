import { describe, expect, it } from "vitest";

import type { GameState, LocalDraftRecord } from "../components/types";
import {
    applyBoardDraftStrokeVertex,
    clearDraftShareCache,
    getBoardDraftStrokeMode,
    moveSetupStone,
    moveSetupStones,
    removeSetupStone,
    toggleBoardDraftStone,
} from "../lib/boardDraft";

const emptyGameState: GameState = {
    setupStones: [],
    moves: [],
    currentPlayer: "B",
};

describe("toggleBoardDraftStone", () => {
    it("places a setup stone with the selected color", () => {
        expect(
            toggleBoardDraftStone({
                gameState: emptyGameState,
                selectedColor: "W",
                vertex: { x: 3, y: 4 },
            })
        ).toEqual({
            setupStones: [{ x: 3, y: 4, color: "W" }],
            moves: [],
            currentPlayer: "B",
        });
    });

    it("removes an existing setup stone instead of replacing it", () => {
        expect(
            toggleBoardDraftStone({
                gameState: {
                    setupStones: [{ x: 3, y: 4, color: "B" }],
                    moves: [],
                    currentPlayer: "B",
                },
                selectedColor: "W",
                vertex: { x: 3, y: 4 },
            })
        ).toEqual(emptyGameState);
    });

    it("always clears move history for board draft edits", () => {
        expect(
            toggleBoardDraftStone({
                gameState: {
                    setupStones: [],
                    moves: [{ type: "play", x: 0, y: 0, color: "B" }],
                    currentPlayer: "W",
                },
                selectedColor: "B",
                vertex: { x: 1, y: 1 },
            })
        ).toEqual({
            setupStones: [{ x: 1, y: 1, color: "B" }],
            moves: [],
            currentPlayer: "W",
        });
    });
});

describe("getBoardDraftStrokeMode", () => {
    it("starts a draw stroke on an empty vertex", () => {
        expect(
            getBoardDraftStrokeMode({
                gameState: emptyGameState,
                vertex: { x: 3, y: 4 },
            })
        ).toBe("draw");
    });

    it("starts an erase stroke on an occupied vertex", () => {
        expect(
            getBoardDraftStrokeMode({
                gameState: {
                    setupStones: [{ x: 3, y: 4, color: "B" }],
                    moves: [],
                    currentPlayer: "B",
                },
                vertex: { x: 3, y: 4 },
            })
        ).toBe("erase");
    });
});

describe("applyBoardDraftStrokeVertex", () => {
    it("draws selected-color stones across empty vertices", () => {
        const firstState = applyBoardDraftStrokeVertex({
            gameState: emptyGameState,
            mode: "draw",
            selectedColor: "W",
            vertex: { x: 3, y: 4 },
        });

        expect(
            applyBoardDraftStrokeVertex({
                gameState: firstState,
                mode: "draw",
                selectedColor: "W",
                vertex: { x: 4, y: 4 },
            })
        ).toEqual({
            setupStones: [
                { x: 3, y: 4, color: "W" },
                { x: 4, y: 4, color: "W" },
            ],
            moves: [],
            currentPlayer: "B",
        });
    });

    it("does not replace occupied stones during a draw stroke", () => {
        expect(
            applyBoardDraftStrokeVertex({
                gameState: {
                    setupStones: [{ x: 3, y: 4, color: "B" }],
                    moves: [],
                    currentPlayer: "B",
                },
                mode: "draw",
                selectedColor: "W",
                vertex: { x: 3, y: 4 },
            })
        ).toEqual({
            setupStones: [{ x: 3, y: 4, color: "B" }],
            moves: [],
            currentPlayer: "B",
        });
    });

    it("erases occupied stones and ignores empty vertices during an erase stroke", () => {
        const firstState = applyBoardDraftStrokeVertex({
            gameState: {
                setupStones: [
                    { x: 3, y: 4, color: "B" },
                    { x: 4, y: 4, color: "W" },
                ],
                moves: [],
                currentPlayer: "B",
            },
            mode: "erase",
            selectedColor: "B",
            vertex: { x: 3, y: 4 },
        });

        expect(
            applyBoardDraftStrokeVertex({
                gameState: firstState,
                mode: "erase",
                selectedColor: "B",
                vertex: { x: 5, y: 4 },
            })
        ).toEqual({
            setupStones: [{ x: 4, y: 4, color: "W" }],
            moves: [],
            currentPlayer: "B",
        });
    });
});

describe("moveSetupStone", () => {
    it("moves a setup stone to an empty vertex and clears move history", () => {
        const result = moveSetupStone({
            boardSize: 19,
            from: { x: 3, y: 4 },
            gameState: {
                setupStones: [
                    { x: 3, y: 4, color: "W" },
                    { x: 10, y: 10, color: "B" },
                ],
                moves: [{ type: "play", x: 0, y: 0, color: "B" }],
                currentPlayer: "W",
            },
            to: { x: 5, y: 6 },
        });

        expect(result).toEqual({
            ok: true,
            gameState: {
                setupStones: [
                    { x: 5, y: 6, color: "W" },
                    { x: 10, y: 10, color: "B" },
                ],
                moves: [],
                currentPlayer: "W",
            },
        });
    });

    it("is a no-op move when source and destination match", () => {
        const gameState: GameState = {
            setupStones: [{ x: 3, y: 4, color: "B" }],
            moves: [],
            currentPlayer: "B",
        };

        const result = moveSetupStone({
            boardSize: 19,
            from: { x: 3, y: 4 },
            gameState,
            to: { x: 3, y: 4 },
        });

        expect(result).toEqual({ ok: true, gameState });
    });

    it("rejects when no stone is at the source vertex", () => {
        expect(
            moveSetupStone({
                boardSize: 19,
                from: { x: 3, y: 4 },
                gameState: emptyGameState,
                to: { x: 5, y: 6 },
            })
        ).toEqual({ ok: false, error: "No stone is selected" });
    });

    it("rejects a move onto an occupied vertex instead of replacing it", () => {
        expect(
            moveSetupStone({
                boardSize: 19,
                from: { x: 3, y: 4 },
                gameState: {
                    setupStones: [
                        { x: 3, y: 4, color: "B" },
                        { x: 5, y: 6, color: "W" },
                    ],
                    moves: [],
                    currentPlayer: "B",
                },
                to: { x: 5, y: 6 },
            })
        ).toEqual({ ok: false, error: "Destination is occupied" });
    });

    it("rejects a move that lands out of bounds", () => {
        expect(
            moveSetupStone({
                boardSize: 9,
                from: { x: 3, y: 4 },
                gameState: {
                    setupStones: [{ x: 3, y: 4, color: "B" }],
                    moves: [],
                    currentPlayer: "B",
                },
                to: { x: 9, y: 4 },
            })
        ).toEqual({ ok: false, error: "Destination is out of bounds" });
    });

    it("rejects a move that leaves a group with no liberties", () => {
        // White surrounds (1,1) on three sides; moving black onto (1,1)
        // self-captures with no liberties.
        const result = moveSetupStone({
            boardSize: 9,
            from: { x: 5, y: 5 },
            gameState: {
                setupStones: [
                    { x: 1, y: 0, color: "W" },
                    { x: 0, y: 1, color: "W" },
                    { x: 2, y: 1, color: "W" },
                    { x: 1, y: 2, color: "W" },
                    { x: 5, y: 5, color: "B" },
                ],
                moves: [],
                currentPlayer: "B",
            },
            to: { x: 1, y: 1 },
        });

        expect(result).toEqual({
            ok: false,
            error: "Move leaves a group with no liberties",
        });
    });
});

describe("moveSetupStones", () => {
    it("moves a group of setup stones by a delta", () => {
        const result = moveSetupStones({
            boardSize: 19,
            dx: 1,
            dy: -1,
            gameState: {
                setupStones: [
                    { x: 3, y: 4, color: "B" },
                    { x: 4, y: 4, color: "B" },
                    { x: 10, y: 10, color: "W" },
                ],
                moves: [],
                currentPlayer: "B",
            },
            indexes: [0, 1],
        });

        expect(result).toEqual({
            ok: true,
            gameState: {
                setupStones: [
                    { x: 4, y: 3, color: "B" },
                    { x: 5, y: 3, color: "B" },
                    { x: 10, y: 10, color: "W" },
                ],
                moves: [],
                currentPlayer: "B",
            },
        });
    });

    it("allows a group to slide onto a vertex vacated by the same group", () => {
        const result = moveSetupStones({
            boardSize: 19,
            dx: 1,
            dy: 0,
            gameState: {
                setupStones: [
                    { x: 3, y: 4, color: "B" },
                    { x: 4, y: 4, color: "B" },
                ],
                moves: [],
                currentPlayer: "B",
            },
            indexes: [0, 1],
        });

        expect(result.ok).toBe(true);
    });

    it("rejects when a moved stone lands on a stationary stone", () => {
        expect(
            moveSetupStones({
                boardSize: 19,
                dx: 1,
                dy: 0,
                gameState: {
                    setupStones: [
                        { x: 3, y: 4, color: "B" },
                        { x: 4, y: 4, color: "W" },
                    ],
                    moves: [],
                    currentPlayer: "B",
                },
                indexes: [0],
            })
        ).toEqual({ ok: false, error: "Destination is occupied" });
    });

    it("rejects a group move that leaves a group with no liberties", () => {
        // White surrounds (1,1); moving black onto it self-captures.
        const result = moveSetupStones({
            boardSize: 9,
            dx: -4,
            dy: -4,
            gameState: {
                setupStones: [
                    { x: 5, y: 5, color: "B" },
                    { x: 1, y: 0, color: "W" },
                    { x: 0, y: 1, color: "W" },
                    { x: 2, y: 1, color: "W" },
                    { x: 1, y: 2, color: "W" },
                ],
                moves: [],
                currentPlayer: "B",
            },
            indexes: [0],
        });

        expect(result).toEqual({
            ok: false,
            error: "Move leaves a group with no liberties",
        });
    });

    it("rejects a group move that runs out of bounds", () => {
        expect(
            moveSetupStones({
                boardSize: 9,
                dx: 0,
                dy: 1,
                gameState: {
                    setupStones: [{ x: 3, y: 8, color: "B" }],
                    moves: [],
                    currentPlayer: "B",
                },
                indexes: [0],
            })
        ).toEqual({ ok: false, error: "Destination is out of bounds" });
    });
});

describe("removeSetupStone", () => {
    it("removes an existing setup stone and clears move history", () => {
        expect(
            removeSetupStone({
                gameState: {
                    setupStones: [
                        { x: 3, y: 4, color: "B" },
                        { x: 5, y: 6, color: "W" },
                    ],
                    moves: [{ type: "play", x: 0, y: 0, color: "B" }],
                    currentPlayer: "W",
                },
                vertex: { x: 3, y: 4 },
            })
        ).toEqual({
            setupStones: [{ x: 5, y: 6, color: "W" }],
            moves: [],
            currentPlayer: "W",
        });
    });

    it("returns the same state when no stone is present", () => {
        expect(
            removeSetupStone({
                gameState: emptyGameState,
                vertex: { x: 3, y: 4 },
            })
        ).toBe(emptyGameState);
    });
});

describe("clearDraftShareCache", () => {
    it("clears the cached share slug while preserving draft metadata", () => {
        const draft: LocalDraftRecord = {
            recordKind: "draft",
            draftKind: "board",
            id: "draft-1",
            boardSize: 19,
            gameState: emptyGameState,
            blackPlayerName: null,
            whitePlayerName: null,
            handicap: 0,
            createdAt: "2026-06-06T00:00:00.000Z",
            updatedAt: "2026-06-06T00:00:00.000Z",
            lastShareSlug: "share123",
            parentShareSlug: null,
            baseMoveCount: null,
        };

        expect(clearDraftShareCache(draft)).toEqual({
            ...draft,
            lastShareSlug: null,
        });
    });
});
