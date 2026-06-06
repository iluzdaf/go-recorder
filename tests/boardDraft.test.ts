import { describe, expect, it } from "vitest";

import type { GameState, LocalDraftRecord } from "../components/types";
import { clearDraftShareCache, toggleBoardDraftStone } from "../lib/boardDraft";

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
