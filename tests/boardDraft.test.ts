import { describe, expect, it } from "vitest";

import type { GameState, LocalDraftRecord } from "../components/types";
import {
    applyBoardDraftStrokeVertex,
    clearDraftShareCache,
    getBoardDraftStrokeMode,
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
