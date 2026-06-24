import { describe, expect, it } from "vitest";

import type { LocalGameRecord } from "../components/types";
import { createLoadedLocalGame } from "../lib/localGameView";

const baseRecord: LocalGameRecord = {
    id: "local-1",
    boardSize: 19,
    gameState: {
        setupStones: [],
        moves: [],
        currentPlayer: "B",
    },
    blackPlayerName: null,
    whitePlayerName: null,
    handicap: 0,
    createdAt: "2026-05-28T00:00:00.000Z",
    updatedAt: "2026-05-28T00:01:00.000Z",
};

describe("createLoadedLocalGame", () => {
    it("maps a local game record to board state", () => {
        expect(createLoadedLocalGame(baseRecord)).toEqual({
            size: 19,
            gameState: {
                setupStones: [],
                moves: [],
                currentPlayer: "B",
            },
            updatedAt: "2026-05-28T00:01:00.000Z",
            metadata: {
                blackPlayerName: null,
                whitePlayerName: null,
                handicap: 0,
                komi: 0,
            },
            snapshot:
                '{"size":19,"gameState":{"setupStones":[],"moves":[],"currentPlayer":"B"}}',
        });
    });

    it("preserves metadata and setup stones", () => {
        expect(
            createLoadedLocalGame({
                ...baseRecord,
                boardSize: 9,
                gameState: {
                    setupStones: [{ x: 2, y: 6, color: "B" }],
                    moves: [],
                    currentPlayer: "W",
                },
                blackPlayerName: "Black",
                whitePlayerName: "White",
                handicap: 2,
            })
        ).toMatchObject({
            size: 9,
            gameState: {
                setupStones: [{ x: 2, y: 6, color: "B" }],
                moves: [],
                currentPlayer: "W",
            },
            metadata: {
                blackPlayerName: "Black",
                whitePlayerName: "White",
                handicap: 2,
            },
        });
    });

    it("defaults komi to 0 for older local records without komi", () => {
        const legacyRecord = {
            ...baseRecord,
        } as unknown as LocalGameRecord;
        delete (legacyRecord as { komi?: number }).komi;

        expect(createLoadedLocalGame(legacyRecord).metadata.komi).toBe(0);
    });

    it("loads komi from the record", () => {
        expect(
            createLoadedLocalGame({ ...baseRecord, komi: 6.5 }).metadata.komi
        ).toBe(6.5);
    });

    it("fills missing setup stones for older local records", () => {
        const legacyRecord = {
            ...baseRecord,
            gameState: {
                moves: [],
                currentPlayer: "B",
            },
        } as unknown as LocalGameRecord;

        expect(createLoadedLocalGame(legacyRecord).gameState).toEqual({
            setupStones: [],
            moves: [],
            currentPlayer: "B",
        });
    });
});
