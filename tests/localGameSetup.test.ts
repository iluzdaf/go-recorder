import { describe, expect, it } from "vitest";

import {
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
