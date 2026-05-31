import { describe, expect, it } from "vitest";

import { validateCreateShareInput } from "../lib/shareValidation";

const validShareInput = {
    sourceKind: "game",
    boardSize: 19,
    gameState: {
        setupStones: [{ x: 3, y: 15, color: "B" }],
        moves: [
            { type: "play", x: 16, y: 3, color: "W" },
            { type: "pass", color: "B" },
        ],
        currentPlayer: "W",
    },
    blackPlayerName: "Black",
    whitePlayerName: null,
    handicap: 2,
};

describe("validateCreateShareInput", () => {
    it("accepts a valid game share input", () => {
        expect(validateCreateShareInput(validShareInput)).toBe(true);
    });

    it("accepts draft as a source kind", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                sourceKind: "draft",
            })
        ).toBe(true);
    });

    it("rejects invalid source kinds", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                sourceKind: "review",
            })
        ).toBe(false);
    });

    it("rejects invalid board sizes", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                boardSize: 15,
            })
        ).toBe(false);
    });

    it("rejects setup stones outside board bounds", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                gameState: {
                    ...validShareInput.gameState,
                    setupStones: [{ x: 19, y: 15, color: "B" }],
                },
            })
        ).toBe(false);
    });

    it("rejects setup stones with invalid colors", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                gameState: {
                    ...validShareInput.gameState,
                    setupStones: [{ x: 3, y: 15, color: "R" }],
                },
            })
        ).toBe(false);
    });

    it("rejects play moves outside board bounds", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                gameState: {
                    ...validShareInput.gameState,
                    moves: [{ type: "play", x: -1, y: 3, color: "B" }],
                },
            })
        ).toBe(false);
    });

    it("rejects pass moves without a valid color", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                gameState: {
                    ...validShareInput.gameState,
                    moves: [{ type: "pass", color: "R" }],
                },
            })
        ).toBe(false);
    });

    it("rejects malformed game states", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                gameState: {
                    moves: [],
                    currentPlayer: "B",
                },
            })
        ).toBe(false);
    });

    it("rejects invalid current players", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                gameState: {
                    ...validShareInput.gameState,
                    currentPlayer: "R",
                },
            })
        ).toBe(false);
    });

    it("rejects invalid player names", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                blackPlayerName: 42,
            })
        ).toBe(false);
    });

    it("rejects invalid handicaps", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                handicap: -1,
            })
        ).toBe(false);
    });
});
