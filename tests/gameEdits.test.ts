import { describe, expect, it } from "vitest";

import type { GameState } from "../components/types";
import { createEditedGameState, validateMoveEdits } from "../lib/gameEdits";

const gameState: GameState = {
    setupStones: [],
    moves: [
        { type: "play", x: 3, y: 3, color: "B" },
        { type: "pass", color: "W" },
        { type: "play", x: 4, y: 4, color: "B" },
    ],
    currentPlayer: "W",
};

describe("createEditedGameState", () => {
    it("returns the same game state for no edits", () => {
        expect(
            createEditedGameState({
                boardSize: 19,
                gameState,
                edits: [],
            })
        ).toEqual({
            ok: true,
            gameState,
        });
    });

    it("updates play move coordinates", () => {
        const result = createEditedGameState({
            boardSize: 19,
            gameState,
            edits: [
                {
                    moveIndex: 0,
                    to: { x: 5, y: 6 },
                },
            ],
        });

        expect(result).toEqual({
            ok: true,
            gameState: {
                ...gameState,
                moves: [
                    { type: "play", x: 5, y: 6, color: "B" },
                    gameState.moves[1],
                    gameState.moves[2],
                ],
            },
        });
        expect(gameState.moves[0]).toEqual({
            type: "play",
            x: 3,
            y: 3,
            color: "B",
        });
    });

    it("supports multiple edited play moves", () => {
        expect(
            createEditedGameState({
                boardSize: 19,
                gameState,
                edits: [
                    {
                        moveIndex: 0,
                        to: { x: 5, y: 6 },
                    },
                    {
                        moveIndex: 2,
                        to: { x: 10, y: 11 },
                    },
                ],
            })
        ).toEqual({
            ok: true,
            gameState: {
                ...gameState,
                moves: [
                    { type: "play", x: 5, y: 6, color: "B" },
                    gameState.moves[1],
                    { type: "play", x: 10, y: 11, color: "B" },
                ],
            },
        });
    });

    it("rejects non-integer move indexes", () => {
        expect(
            createEditedGameState({
                boardSize: 19,
                gameState,
                edits: [
                    {
                        moveIndex: 0.5,
                        to: { x: 5, y: 6 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Edit move index must be an integer",
        });
    });

    it("rejects out-of-range move indexes", () => {
        expect(
            createEditedGameState({
                boardSize: 19,
                gameState,
                edits: [
                    {
                        moveIndex: 99,
                        to: { x: 5, y: 6 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Edit move index is out of range",
        });
    });

    it("rejects duplicate move indexes", () => {
        expect(
            createEditedGameState({
                boardSize: 19,
                gameState,
                edits: [
                    {
                        moveIndex: 0,
                        to: { x: 5, y: 6 },
                    },
                    {
                        moveIndex: 0,
                        to: { x: 7, y: 8 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Edit move indexes must be unique",
        });
    });

    it("rejects pass moves", () => {
        expect(
            createEditedGameState({
                boardSize: 19,
                gameState,
                edits: [
                    {
                        moveIndex: 1,
                        to: { x: 5, y: 6 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Only play moves can be edited",
        });
    });

    it("rejects out-of-bounds destinations", () => {
        expect(
            createEditedGameState({
                boardSize: 19,
                gameState,
                edits: [
                    {
                        moveIndex: 0,
                        to: { x: 19, y: 6 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Edit destination is out of bounds",
        });
    });
});

describe("validateMoveEdits", () => {
    it("returns the original game state for no edits", () => {
        expect(
            validateMoveEdits({
                boardSize: 19,
                originalGameState: gameState,
                edits: [],
            })
        ).toEqual({
            ok: true,
            gameState,
        });
    });

    it("delegates malformed edit rejection to createEditedGameState", () => {
        expect(
            validateMoveEdits({
                boardSize: 19,
                originalGameState: gameState,
                edits: [
                    {
                        moveIndex: 1,
                        to: { x: 5, y: 6 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Only play moves can be edited",
        });
    });

    it("accepts an edit when the edited game replays cleanly", () => {
        expect(
            validateMoveEdits({
                boardSize: 19,
                originalGameState: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 3, y: 3, color: "B" },
                        { type: "play", x: 10, y: 10, color: "W" },
                    ],
                    currentPlayer: "B",
                },
                edits: [
                    {
                        moveIndex: 0,
                        to: { x: 4, y: 3 },
                    },
                ],
            })
        ).toEqual({
            ok: true,
            gameState: {
                setupStones: [],
                moves: [
                    { type: "play", x: 4, y: 3, color: "B" },
                    { type: "play", x: 10, y: 10, color: "W" },
                ],
                currentPlayer: "B",
            },
        });
    });

    it("accepts multiple edits when future replay and captures are unchanged", () => {
        expect(
            validateMoveEdits({
                boardSize: 19,
                originalGameState: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 3, y: 3, color: "B" },
                        { type: "play", x: 10, y: 10, color: "W" },
                        { type: "play", x: 16, y: 16, color: "B" },
                    ],
                    currentPlayer: "W",
                },
                edits: [
                    {
                        moveIndex: 0,
                        to: { x: 4, y: 3 },
                    },
                    {
                        moveIndex: 2,
                        to: { x: 15, y: 16 },
                    },
                ],
            })
        ).toEqual({
            ok: true,
            gameState: {
                setupStones: [],
                moves: [
                    { type: "play", x: 4, y: 3, color: "B" },
                    { type: "play", x: 10, y: 10, color: "W" },
                    { type: "play", x: 15, y: 16, color: "B" },
                ],
                currentPlayer: "W",
            },
        });
    });

    it("rejects edits that make future replay illegal", () => {
        expect(
            validateMoveEdits({
                boardSize: 19,
                originalGameState: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 3, y: 3, color: "B" },
                        { type: "play", x: 4, y: 4, color: "W" },
                    ],
                    currentPlayer: "B",
                },
                edits: [
                    {
                        moveIndex: 0,
                        to: { x: 4, y: 4 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Overwrite prevented",
        });
    });

    it("rejects edits when the edited move overwrites a setup stone", () => {
        expect(
            validateMoveEdits({
                boardSize: 9,
                originalGameState: {
                    setupStones: [{ x: 2, y: 2, color: "B" }],
                    moves: [
                        { type: "play", x: 4, y: 4, color: "W" },
                    ],
                    currentPlayer: "B",
                },
                edits: [
                    {
                        moveIndex: 0,
                        to: { x: 2, y: 2 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Overwrite prevented",
        });
    });

    it("rejects edits when the edited move overwrites an earlier move", () => {
        expect(
            validateMoveEdits({
                boardSize: 9,
                originalGameState: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 1, y: 1, color: "B" },
                        { type: "play", x: 4, y: 4, color: "W" },
                    ],
                    currentPlayer: "B",
                },
                edits: [
                    {
                        moveIndex: 1,
                        to: { x: 1, y: 1 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Overwrite prevented",
        });
    });

    it("rejects edits when the edited move becomes suicide", () => {
        expect(
            validateMoveEdits({
                boardSize: 9,
                originalGameState: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 0, y: 1, color: "B" },
                        { type: "play", x: 8, y: 8, color: "W" },
                        { type: "play", x: 1, y: 0, color: "B" },
                        { type: "play", x: 5, y: 5, color: "W" },
                    ],
                    currentPlayer: "B",
                },
                edits: [
                    {
                        moveIndex: 3,
                        to: { x: 0, y: 0 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Suicide prevented",
        });
    });

    it("rejects edits that make future ko replay illegal", () => {
        expect(
            validateMoveEdits({
                boardSize: 9,
                originalGameState: {
                    setupStones: [
                        { x: 0, y: 1, color: "B" },
                        { x: 1, y: 0, color: "B" },
                        { x: 1, y: 2, color: "B" },
                        { x: 2, y: 0, color: "W" },
                        { x: 2, y: 2, color: "W" },
                        { x: 3, y: 1, color: "W" },
                    ],
                    moves: [
                        { type: "play", x: 5, y: 5, color: "B" },
                        { type: "play", x: 1, y: 1, color: "W" },
                        { type: "play", x: 2, y: 1, color: "B" },
                    ],
                    currentPlayer: "W",
                },
                edits: [
                    {
                        moveIndex: 0,
                        to: { x: 2, y: 1 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Ko prevented",
        });
    });

    it("rejects edits that change captured move indexes", () => {
        expect(
            validateMoveEdits({
                boardSize: 9,
                originalGameState: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 1, y: 1, color: "W" },
                        { type: "play", x: 0, y: 1, color: "B" },
                        { type: "play", x: 8, y: 8, color: "W" },
                        { type: "play", x: 1, y: 0, color: "B" },
                        { type: "play", x: 8, y: 7, color: "W" },
                        { type: "play", x: 2, y: 1, color: "B" },
                        { type: "play", x: 7, y: 8, color: "W" },
                        { type: "play", x: 1, y: 2, color: "B" },
                    ],
                    currentPlayer: "W",
                },
                edits: [
                    {
                        moveIndex: 0,
                        to: { x: 5, y: 5 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Edit changes future captures",
        });
    });

    it("allows edits when the same future move captures the same source stone", () => {
        expect(
            validateMoveEdits({
                boardSize: 9,
                originalGameState: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 1, y: 0, color: "W" },
                        { type: "play", x: 0, y: 0, color: "B" },
                        { type: "play", x: 8, y: 8, color: "W" },
                        { type: "play", x: 2, y: 0, color: "B" },
                        { type: "play", x: 8, y: 7, color: "W" },
                        { type: "play", x: 0, y: 2, color: "B" },
                        { type: "play", x: 7, y: 8, color: "W" },
                        { type: "play", x: 1, y: 1, color: "B" },
                    ],
                    currentPlayer: "W",
                },
                edits: [
                    {
                        moveIndex: 0,
                        to: { x: 0, y: 1 },
                    },
                ],
            })
        ).toEqual({
            ok: true,
            gameState: {
                setupStones: [],
                moves: [
                    { type: "play", x: 0, y: 1, color: "W" },
                    { type: "play", x: 0, y: 0, color: "B" },
                    { type: "play", x: 8, y: 8, color: "W" },
                    { type: "play", x: 2, y: 0, color: "B" },
                    { type: "play", x: 8, y: 7, color: "W" },
                    { type: "play", x: 0, y: 2, color: "B" },
                    { type: "play", x: 7, y: 8, color: "W" },
                    { type: "play", x: 1, y: 1, color: "B" },
                ],
                currentPlayer: "W",
            },
        });
    });

    it("rejects edits when a future move gains a new capture", () => {
        expect(
            validateMoveEdits({
                boardSize: 9,
                originalGameState: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 5, y: 5, color: "W" },
                        { type: "play", x: 0, y: 1, color: "B" },
                        { type: "play", x: 8, y: 8, color: "W" },
                        { type: "play", x: 1, y: 0, color: "B" },
                        { type: "play", x: 8, y: 7, color: "W" },
                        { type: "play", x: 2, y: 1, color: "B" },
                        { type: "play", x: 7, y: 8, color: "W" },
                        { type: "play", x: 1, y: 2, color: "B" },
                    ],
                    currentPlayer: "W",
                },
                edits: [
                    {
                        moveIndex: 0,
                        to: { x: 1, y: 1 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Edit changes future captures",
        });
    });

    it("rejects edits when the original game cannot be replayed", () => {
        expect(
            validateMoveEdits({
                boardSize: 19,
                originalGameState: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 3, y: 3, color: "B" },
                        { type: "play", x: 3, y: 3, color: "W" },
                    ],
                    currentPlayer: "B",
                },
                edits: [
                    {
                        moveIndex: 0,
                        to: { x: 4, y: 4 },
                    },
                ],
            })
        ).toEqual({
            ok: false,
            error: "Overwrite prevented",
        });
    });
});
