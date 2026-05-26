import { describe, expect, it } from "vitest";

import {
    createGameSnapshot,
    createSlug,
    getHandicapSetupStones,
    isValidBoardSize,
    isValidGameState,
    shouldAutosave,
    shouldContinueAutosaveQueue,
} from "../lib/gameLogic";

describe("createSlug", () => {
    it("creates an 8 character slug", () => {
        const slug = createSlug();

        expect(slug).toHaveLength(8);
    });

    it("creates different slugs", () => {
        const firstSlug = createSlug();
        const secondSlug = createSlug();

        expect(firstSlug).not.toBe(secondSlug);
    });
});

describe("isValidBoardSize", () => {
    it("accepts supported board sizes", () => {
        expect(isValidBoardSize(9)).toBe(true);
        expect(isValidBoardSize(13)).toBe(true);
        expect(isValidBoardSize(19)).toBe(true);
    });

    it("rejects unsupported board sizes", () => {
        expect(isValidBoardSize(0)).toBe(false);
        expect(isValidBoardSize(8)).toBe(false);
        expect(isValidBoardSize(10)).toBe(false);
        expect(isValidBoardSize(20)).toBe(false);
        expect(isValidBoardSize("19")).toBe(false);
        expect(isValidBoardSize(null)).toBe(false);
        expect(isValidBoardSize(undefined)).toBe(false);
    });
});

describe("isValidGameState", () => {
    it("accepts an object with a moves array", () => {
        expect(
            isValidGameState({
                moves: [],
                currentPlayer: "B",
            })
        ).toBe(true);
    });

    it("rejects values without a moves array", () => {
        expect(isValidGameState(null)).toBe(false);
        expect(isValidGameState(undefined)).toBe(false);
        expect(isValidGameState({})).toBe(false);
        expect(isValidGameState({ moves: "not an array" })).toBe(false);
        expect(isValidGameState([])).toBe(false);
    });
});

describe("getHandicapSetupStones", () => {
    it("returns no setup stones for no handicap", () => {
        expect(getHandicapSetupStones(19, 0)).toEqual([]);
        expect(getHandicapSetupStones(19, 1)).toEqual([]);
    });

    it("returns standard 19x19 two-stone handicap placement", () => {
        expect(getHandicapSetupStones(19, 2)).toEqual([
            { x: 3, y: 15 },
            { x: 15, y: 3 },
        ]);
    });

    it("includes tengen for 19x19 five-stone handicap", () => {
        expect(getHandicapSetupStones(19, 5)).toEqual([
            { x: 3, y: 15 },
            { x: 15, y: 3 },
            { x: 3, y: 3 },
            { x: 15, y: 15 },
            { x: 9, y: 9 },
        ]);
    });

    it("returns all nine 13x13 handicap points for nine-stone handicap", () => {
        expect(getHandicapSetupStones(13, 9)).toEqual([
            { x: 3, y: 9 },
            { x: 9, y: 3 },
            { x: 3, y: 3 },
            { x: 9, y: 9 },
            { x: 3, y: 6 },
            { x: 9, y: 6 },
            { x: 6, y: 3 },
            { x: 6, y: 9 },
            { x: 6, y: 6 },
        ]);
    });

    it("returns all nine 9x9 handicap points for nine-stone handicap", () => {
        expect(getHandicapSetupStones(9, 9)).toEqual([
            { x: 2, y: 6 },
            { x: 6, y: 2 },
            { x: 2, y: 2 },
            { x: 6, y: 6 },
            { x: 2, y: 4 },
            { x: 6, y: 4 },
            { x: 4, y: 2 },
            { x: 4, y: 6 },
            { x: 4, y: 4 },
        ]);
    });

    it("returns no setup stones for unsupported handicap counts", () => {
        expect(getHandicapSetupStones(19, 10)).toEqual([]);
        expect(getHandicapSetupStones(13, -1)).toEqual([]);
    });
});

describe("createGameSnapshot", () => {
    it("creates the same snapshot for the same board size and game state", () => {
        const gameState = {
            moves: [],
            currentPlayer: "B" as const,
        };

        const firstSnapshot = createGameSnapshot(19, gameState);
        const secondSnapshot = createGameSnapshot(19, gameState);

        expect(firstSnapshot).toBe(secondSnapshot);
    });

    it("creates different snapshots when the board size changes", () => {
        const gameState = {
            moves: [],
            currentPlayer: "B" as const,
        };

        expect(createGameSnapshot(9, gameState)).not.toBe(
            createGameSnapshot(19, gameState)
        );
    });

    it("creates different snapshots when the game state changes", () => {
        const emptyGameState = {
            moves: [],
            currentPlayer: "B" as const,
        };
        const gameStateWithMove = {
            moves: [
                {
                    type: "play" as const,
                    x: 3,
                    y: 3,
                    color: "B" as const,
                },
            ],
            currentPlayer: "W" as const,
        };

        expect(createGameSnapshot(19, emptyGameState)).not.toBe(
            createGameSnapshot(19, gameStateWithMove)
        );
    });
});

describe("shouldAutosave", () => {
    const changedSnapshot = "changed";
    const savedSnapshot = "saved";

    it("does not autosave before the game has loaded", () => {
        expect(
            shouldAutosave({
                hasLoadedGame: false,
                updatedAt: "2026-05-25T00:00:00.000Z",
                hasUnsavedChanges: true,
                currentSnapshot: changedSnapshot,
                lastSavedSnapshot: savedSnapshot,
            })
        ).toBe(false);
    });

    it("does not autosave without an updatedAt value", () => {
        expect(
            shouldAutosave({
                hasLoadedGame: true,
                updatedAt: null,
                hasUnsavedChanges: true,
                currentSnapshot: changedSnapshot,
                lastSavedSnapshot: savedSnapshot,
            })
        ).toBe(false);
    });

    it("does not autosave when there are no unsaved changes", () => {
        expect(
            shouldAutosave({
                hasLoadedGame: true,
                updatedAt: "2026-05-25T00:00:00.000Z",
                hasUnsavedChanges: false,
                currentSnapshot: changedSnapshot,
                lastSavedSnapshot: savedSnapshot,
            })
        ).toBe(false);
    });

    it("does not autosave when the current snapshot matches the last saved snapshot", () => {
        expect(
            shouldAutosave({
                hasLoadedGame: true,
                updatedAt: "2026-05-25T00:00:00.000Z",
                hasUnsavedChanges: true,
                currentSnapshot: savedSnapshot,
                lastSavedSnapshot: savedSnapshot,
            })
        ).toBe(false);
    });

    it("autosaves when the game is loaded, dirty, has updatedAt, and the snapshot changed", () => {
        expect(
            shouldAutosave({
                hasLoadedGame: true,
                updatedAt: "2026-05-25T00:00:00.000Z",
                hasUnsavedChanges: true,
                currentSnapshot: changedSnapshot,
                lastSavedSnapshot: savedSnapshot,
            })
        ).toBe(true);
    });
});

describe("shouldContinueAutosaveQueue", () => {
    it("does not continue when no save was requested during the current save", () => {
        expect(
            shouldContinueAutosaveQueue({
                needsSaveAfterCurrentSave: false,
                latestSnapshot: "changed",
                lastSavedSnapshot: "saved",
            })
        ).toBe(false);
    });

    it("does not continue when the latest snapshot has already been saved", () => {
        expect(
            shouldContinueAutosaveQueue({
                needsSaveAfterCurrentSave: true,
                latestSnapshot: "saved",
                lastSavedSnapshot: "saved",
            })
        ).toBe(false);
    });

    it("continues when another save was requested and the latest snapshot is still unsaved", () => {
        expect(
            shouldContinueAutosaveQueue({
                needsSaveAfterCurrentSave: true,
                latestSnapshot: "changed",
                lastSavedSnapshot: "saved",
            })
        ).toBe(true);
    });
});