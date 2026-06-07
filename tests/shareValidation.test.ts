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
    it.each(["game", "draft"] as const)(
        "accepts a valid %s share input",
        (sourceKind) => {
            expect(
                validateCreateShareInput({
                    ...validShareInput,
                    sourceKind,
                })
            ).toBe(true);
        }
    );

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

    it("accepts variation draft metadata", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                sourceKind: "draft",
                draftKind: "variation",
                parentShareSlug: "share123",
                baseMoveCount: 1,
            })
        ).toBe(true);
    });

    it("rejects draft metadata on game shares", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                draftKind: "variation",
                parentShareSlug: "share123",
                baseMoveCount: 1,
            })
        ).toBe(false);
    });

    it("rejects incomplete variation draft metadata", () => {
        expect(
            validateCreateShareInput({
                ...validShareInput,
                sourceKind: "draft",
                draftKind: "variation",
                parentShareSlug: null,
                baseMoveCount: 1,
            })
        ).toBe(false);
    });
});
