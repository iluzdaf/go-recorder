import { describe, expect, it } from "vitest";

import {
    createDefaultLocalBoardDraftInput,
    createLocalBoardDraftInputFromForm,
    createInitialGameState,
    createLocalGameInputFromForm,
    getOptionalPlayerName,
} from "../lib/localGameSetup";

describe("getOptionalPlayerName", () => {
    it("trims player names", () => {
        expect(getOptionalPlayerName("  Black  ")).toBe("Black");
    });

    it("returns null for empty player names", () => {
        expect(getOptionalPlayerName("")).toBeNull();
        expect(getOptionalPlayerName("   ")).toBeNull();
    });
});

describe("createInitialGameState", () => {
    it("starts black for an even game", () => {
        expect(createInitialGameState(19, 0)).toEqual({
            setupStones: [],
            moves: [],
            currentPlayer: "B",
        });
    });

    it("starts white after handicap setup stones", () => {
        expect(createInitialGameState(19, 2)).toEqual({
            setupStones: [
                { x: 3, y: 15, color: "B" },
                { x: 15, y: 3, color: "B" },
            ],
            moves: [],
            currentPlayer: "W",
        });
    });
});

describe("createLocalGameInputFromForm", () => {
    it("creates local game input from form values", () => {
        expect(
            createLocalGameInputFromForm({
                boardSize: 13,
                blackPlayerName: "  Black Player ",
                whitePlayerName: " ",
                handicap: 0,
            })
        ).toEqual({
            boardSize: 13,
            gameState: {
                setupStones: [],
                moves: [],
                currentPlayer: "B",
            },
            blackPlayerName: "Black Player",
            whitePlayerName: null,
            handicap: 0,
        });
    });
});

describe("createLocalBoardDraftInputFromForm", () => {
    it("creates board draft input from form values", () => {
        expect(
            createLocalBoardDraftInputFromForm({
                boardSize: 9,
                blackPlayerName: "  Black Player ",
                whitePlayerName: "White Player",
                handicap: 2,
            })
        ).toEqual({
            draftKind: "board",
            boardSize: 9,
            gameState: {
                setupStones: [
                    { x: 2, y: 6, color: "B" },
                    { x: 6, y: 2, color: "B" },
                ],
                moves: [],
                currentPlayer: "W",
            },
            blackPlayerName: "Black Player",
            whitePlayerName: "White Player",
            handicap: 2,
        });
    });
});

describe("createDefaultLocalBoardDraftInput", () => {
    it("creates an empty 19 x 19 board draft input", () => {
        expect(createDefaultLocalBoardDraftInput()).toEqual({
            draftKind: "board",
            boardSize: 19,
            gameState: {
                setupStones: [],
                moves: [],
                currentPlayer: "B",
            },
            blackPlayerName: null,
            whitePlayerName: null,
            handicap: 0,
        });
    });
});
