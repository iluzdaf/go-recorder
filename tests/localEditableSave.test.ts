import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GameState } from "../components/types";
import {
    createLocalEditableSaveRecord,
    saveLocalEditableRecord,
} from "../lib/localEditableSave";
import { createLocalDraft, createLocalGame, getLocalRecord } from "../lib/localGames";

function createStorageMock() {
    const items = new Map<string, string>();

    return {
        clear: vi.fn(() => {
            items.clear();
        }),
        getItem: vi.fn((key: string) => items.get(key) ?? null),
        key: vi.fn((index: number) => Array.from(items.keys())[index] ?? null),
        removeItem: vi.fn((key: string) => {
            items.delete(key);
        }),
        setItem: vi.fn((key: string, value: string) => {
            items.set(key, value);
        }),
        get length() {
            return items.size;
        },
    };
}

const emptyGameState: GameState = {
    setupStones: [],
    moves: [],
    currentPlayer: "B",
};

describe("local editable save helpers", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-07T00:00:00.000Z"));
        vi.stubGlobal("window", {
            localStorage: createStorageMock(),
        });
    });

    it("prepares local editable records with board changes and cleared share cache", () => {
        const record = createLocalGame({
            boardSize: 19,
            gameState: emptyGameState,
        });
        const gameState: GameState = {
            setupStones: [],
            moves: [{ type: "play", x: 3, y: 3, color: "B" }],
            currentPlayer: "W",
        };

        expect(
            createLocalEditableSaveRecord({
                boardSize: 9,
                clearShareSlug: true,
                gameState,
                record: {
                    ...record,
                    lastShareSlug: "share123",
                },
            })
        ).toEqual({
            ...record,
            boardSize: 9,
            gameState,
            lastShareSlug: null,
        });
    });

    it("saves local game records with updated timestamps", () => {
        const record = createLocalGame({
            boardSize: 19,
            gameState: emptyGameState,
        });
        const gameState: GameState = {
            setupStones: [],
            moves: [{ type: "pass", color: "B" }],
            currentPlayer: "W",
        };

        vi.setSystemTime(new Date("2026-06-07T00:01:00.000Z"));

        const savedRecord = saveLocalEditableRecord({
            gameState,
            record,
        });

        expect(savedRecord).toEqual({
            ...record,
            gameState,
            updatedAt: "2026-06-07T00:01:00.000Z",
        });
        expect(getLocalRecord(record.id)).toEqual(savedRecord);
    });

    it("saves local drafts while preserving draft metadata", () => {
        const record = createLocalDraft({
            baseMoveCount: 7,
            boardSize: 19,
            draftKind: "variation",
            gameState: emptyGameState,
            parentShareSlug: "parent123",
        });
        const gameState: GameState = {
            setupStones: [{ x: 4, y: 4, color: "W" }],
            moves: [],
            currentPlayer: "B",
        };

        vi.setSystemTime(new Date("2026-06-07T00:02:00.000Z"));

        const savedRecord = saveLocalEditableRecord({
            clearShareSlug: true,
            gameState,
            record: {
                ...record,
                lastShareSlug: "share456",
            },
        });

        expect(savedRecord).toEqual({
            ...record,
            gameState,
            lastShareSlug: null,
            updatedAt: "2026-06-07T00:02:00.000Z",
        });
        expect(getLocalRecord(record.id)).toEqual(savedRecord);
    });
});
