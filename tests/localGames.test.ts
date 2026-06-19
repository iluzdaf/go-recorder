import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    createLocalDraft,
    createLocalGame,
    getLocalGame,
    getLocalRecord,
    saveLocalGame,
    saveLocalRecord,
    type LocalGameRecord,
} from "../lib/localGames";
import type { GameState } from "../components/types";

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

describe("local game storage", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-05-28T00:00:00.000Z"));
        vi.stubGlobal("window", {
            localStorage: createStorageMock(),
        });
    });

    it("creates and stores a local game record", () => {
        const record = createLocalGame({
            boardSize: 19,
            gameState: emptyGameState,
        });

        expect(record).toMatchObject({
            recordKind: "game",
            boardSize: 19,
            gameState: emptyGameState,
            blackPlayerName: null,
            whitePlayerName: null,
            handicap: 0,
            createdAt: "2026-05-28T00:00:00.000Z",
            updatedAt: "2026-05-28T00:00:00.000Z",
        });
        expect(record.id).toHaveLength(36);
        expect(getLocalGame(record.id)).toEqual(record);
    });

    it("stores optional game metadata", () => {
        const record = createLocalGame({
            boardSize: 9,
            gameState: emptyGameState,
            blackPlayerName: "Black",
            whitePlayerName: "White",
            handicap: 2,
        });

        expect(getLocalGame(record.id)).toMatchObject({
            boardSize: 9,
            recordKind: "game",
            blackPlayerName: "Black",
            whitePlayerName: "White",
            handicap: 2,
            lastShareSlug: null,
        });
    });

    it("returns null when a local game does not exist", () => {
        expect(getLocalGame("missing")).toBeNull();
    });

    it("loads existing game records without a record kind", () => {
        const legacyRecord = {
            id: "legacy-game",
            boardSize: 19,
            gameState: emptyGameState,
            blackPlayerName: null,
            whitePlayerName: null,
            handicap: 0,
            createdAt: "2026-05-28T00:00:00.000Z",
            updatedAt: "2026-05-28T00:00:00.000Z",
            lastShareSlug: null,
        };

        window.localStorage.setItem(
            "go-recorder:local-game:legacy-game",
            JSON.stringify(legacyRecord)
        );

        expect(getLocalGame("legacy-game")).toEqual(legacyRecord);
        expect(getLocalRecord("legacy-game")).toEqual(legacyRecord);
    });

    it("returns null when stored data is not valid JSON", () => {
        window.localStorage.setItem("go-recorder:local-game:broken", "{");

        expect(getLocalGame("broken")).toBeNull();
    });

    it("returns null when stored data is not a local game record", () => {
        window.localStorage.setItem(
            "go-recorder:local-game:invalid",
            JSON.stringify({
                id: "invalid",
                boardSize: 15,
                gameState: emptyGameState,
                blackPlayerName: null,
                whitePlayerName: null,
                handicap: 0,
                createdAt: "2026-05-28T00:00:00.000Z",
                updatedAt: "2026-05-28T00:00:00.000Z",
            })
        );

        expect(getLocalGame("invalid")).toBeNull();
    });

    it("saves a local game with a new updatedAt timestamp", () => {
        const record = createLocalGame({
            boardSize: 19,
            gameState: emptyGameState,
        });
        const changedGameState: GameState = {
            setupStones: [],
            moves: [{ type: "play", x: 3, y: 3, color: "B" }],
            currentPlayer: "W",
        };

        vi.setSystemTime(new Date("2026-05-28T00:01:00.000Z"));

        const savedRecord = saveLocalGame({
            ...record,
            gameState: changedGameState,
        });

        const expectedRecord: LocalGameRecord = {
            ...record,
            gameState: changedGameState,
            updatedAt: "2026-05-28T00:01:00.000Z",
        };

        expect(savedRecord).toEqual(expectedRecord);
        expect(getLocalGame(record.id)).toEqual(expectedRecord);
    });

    it("preserves local game metadata when saving board changes", () => {
        const record = createLocalGame({
            boardSize: 19,
            gameState: emptyGameState,
            blackPlayerName: "Black",
            whitePlayerName: "White",
            handicap: 2,
        });

        vi.setSystemTime(new Date("2026-05-28T00:02:00.000Z"));

        const savedRecord = saveLocalGame({
            ...record,
            boardSize: 9,
            gameState: {
                setupStones: [],
                moves: [{ type: "pass", color: "B" }],
                currentPlayer: "W",
            },
        });

        expect(savedRecord).toEqual({
            recordKind: "game",
            id: record.id,
            boardSize: 9,
            gameState: {
                setupStones: [],
                moves: [{ type: "pass", color: "B" }],
                currentPlayer: "W",
            },
            blackPlayerName: "Black",
            whitePlayerName: "White",
            handicap: 2,
            createdAt: "2026-05-28T00:00:00.000Z",
            updatedAt: "2026-05-28T00:02:00.000Z",
            lastShareSlug: null,
        });
    });

    it("preserves the last share slug when saving", () => {
        const record = createLocalGame({
            boardSize: 19,
            gameState: emptyGameState,
        });

        vi.setSystemTime(new Date("2026-05-28T00:03:00.000Z"));

        const savedRecord = saveLocalGame({
            ...record,
            lastShareSlug: "share123",
        });

        expect(savedRecord).toEqual({
            ...record,
            lastShareSlug: "share123",
            updatedAt: "2026-05-28T00:03:00.000Z",
        });
    });

    it("creates and stores a board draft without parent metadata", () => {
        const record = createLocalDraft({
            draftKind: "board",
            boardSize: 19,
            gameState: emptyGameState,
        });

        expect(record).toMatchObject({
            recordKind: "draft",
            draftKind: "board",
            boardSize: 19,
            gameState: emptyGameState,
            blackPlayerName: null,
            whitePlayerName: null,
            handicap: 0,
            createdAt: "2026-05-28T00:00:00.000Z",
            updatedAt: "2026-05-28T00:00:00.000Z",
            lastShareSlug: null,
            parentShareSlug: null,
            baseMoveCount: null,
            positionView: null,
        });
        expect(record.id).toHaveLength(36);
        expect(getLocalRecord(record.id)).toEqual(record);
        expect(getLocalGame(record.id)).toBeNull();
    });

    it("creates and stores a board draft position view", () => {
        const record = createLocalDraft({
            draftKind: "board",
            boardSize: 19,
            gameState: emptyGameState,
            positionView: {
                anchor: "top-left",
                rows: 6,
                columns: 8,
            },
        });

        expect(getLocalRecord(record.id)).toMatchObject({
            positionView: {
                anchor: "top-left",
                rows: 6,
                columns: 8,
            },
        });
    });

    it("creates and stores a variation draft with parent metadata", () => {
        const record = createLocalDraft({
            draftKind: "variation",
            boardSize: 19,
            gameState: emptyGameState,
            parentShareSlug: "share123",
            baseMoveCount: 12,
        });

        expect(record).toMatchObject({
            recordKind: "draft",
            draftKind: "variation",
            parentShareSlug: "share123",
            baseMoveCount: 12,
        });
        expect(getLocalRecord(record.id)).toEqual(record);
    });

    it("rejects variation drafts without parent metadata", () => {
        expect(() =>
            createLocalDraft({
                draftKind: "variation",
                boardSize: 19,
                gameState: emptyGameState,
            })
        ).toThrow("Invalid local draft record");
    });

    it("rejects stored variation drafts with invalid base move counts", () => {
        window.localStorage.setItem(
            "go-recorder:local-game:invalid-variation",
            JSON.stringify({
                recordKind: "draft",
                draftKind: "variation",
                id: "invalid-variation",
                boardSize: 19,
                gameState: emptyGameState,
                blackPlayerName: null,
                whitePlayerName: null,
                handicap: 0,
                createdAt: "2026-05-28T00:00:00.000Z",
                updatedAt: "2026-05-28T00:00:00.000Z",
                lastShareSlug: null,
                parentShareSlug: "share123",
                baseMoveCount: -1,
            })
        );

        expect(getLocalRecord("invalid-variation")).toBeNull();
    });

    it("creates and stores a variation draft position view", () => {
        const record = createLocalDraft({
            draftKind: "variation",
            boardSize: 19,
            gameState: emptyGameState,
            parentShareSlug: "share123",
            baseMoveCount: 1,
            positionView: {
                anchor: "top-left",
                rows: 6,
                columns: 6,
            },
        });

        expect(getLocalRecord(record.id)).toMatchObject({
            draftKind: "variation",
            positionView: {
                anchor: "top-left",
                rows: 6,
                columns: 6,
            },
        });
    });

    it("creates a board draft with an imageSourceId", () => {
        const record = createLocalDraft({
            draftKind: "board",
            boardSize: 19,
            gameState: emptyGameState,
            imageSourceId: "img-abc",
        });

        expect(record).toMatchObject({
            recordKind: "draft",
            draftKind: "board",
            imageSourceId: "img-abc",
        });
        expect(getLocalRecord(record.id)).toMatchObject({ imageSourceId: "img-abc" });
    });

    it("creates a board draft without imageSourceId by default", () => {
        const record = createLocalDraft({
            draftKind: "board",
            boardSize: 19,
            gameState: emptyGameState,
        });

        expect(record.imageSourceId).toBeNull();
        expect(getLocalRecord(record.id)).toMatchObject({ imageSourceId: null });
    });

    it("accepts stored draft records with imageSourceId", () => {
        window.localStorage.setItem(
            "go-recorder:local-game:draft-with-img",
            JSON.stringify({
                recordKind: "draft",
                draftKind: "board",
                id: "draft-with-img",
                boardSize: 19,
                gameState: emptyGameState,
                blackPlayerName: null,
                whitePlayerName: null,
                handicap: 0,
                createdAt: "2026-05-28T00:00:00.000Z",
                updatedAt: "2026-05-28T00:00:00.000Z",
                lastShareSlug: null,
                parentShareSlug: null,
                baseMoveCount: null,
                positionView: null,
                imageSourceId: "img-stored",
            })
        );

        expect(getLocalRecord("draft-with-img")).toMatchObject({
            imageSourceId: "img-stored",
        });
    });

    it("accepts stored draft records without imageSourceId (backwards compatibility)", () => {
        window.localStorage.setItem(
            "go-recorder:local-game:draft-no-img",
            JSON.stringify({
                recordKind: "draft",
                draftKind: "board",
                id: "draft-no-img",
                boardSize: 19,
                gameState: emptyGameState,
                blackPlayerName: null,
                whitePlayerName: null,
                handicap: 0,
                createdAt: "2026-05-28T00:00:00.000Z",
                updatedAt: "2026-05-28T00:00:00.000Z",
                lastShareSlug: null,
                parentShareSlug: null,
                baseMoveCount: null,
                positionView: null,
            })
        );

        const record = getLocalRecord("draft-no-img");
        expect(record).not.toBeNull();
        expect((record as { imageSourceId?: unknown }).imageSourceId).toBeUndefined();
    });

    it("rejects stored draft records with invalid imageSourceId", () => {
        window.localStorage.setItem(
            "go-recorder:local-game:draft-bad-img",
            JSON.stringify({
                recordKind: "draft",
                draftKind: "board",
                id: "draft-bad-img",
                boardSize: 19,
                gameState: emptyGameState,
                blackPlayerName: null,
                whitePlayerName: null,
                handicap: 0,
                createdAt: "2026-05-28T00:00:00.000Z",
                updatedAt: "2026-05-28T00:00:00.000Z",
                lastShareSlug: null,
                parentShareSlug: null,
                baseMoveCount: null,
                positionView: null,
                imageSourceId: 42,
            })
        );

        expect(getLocalRecord("draft-bad-img")).toBeNull();
    });

    it("saves local drafts while preserving draft metadata", () => {
        const record = createLocalDraft({
            draftKind: "variation",
            boardSize: 19,
            gameState: emptyGameState,
            parentShareSlug: "share123",
            baseMoveCount: 2,
        });
        const changedGameState: GameState = {
            setupStones: [],
            moves: [{ type: "play", x: 4, y: 4, color: "B" }],
            currentPlayer: "W",
        };

        vi.setSystemTime(new Date("2026-05-28T00:04:00.000Z"));

        const savedRecord = saveLocalRecord({
            ...record,
            gameState: changedGameState,
            lastShareSlug: "share456",
        });

        expect(savedRecord).toEqual({
            ...record,
            gameState: changedGameState,
            lastShareSlug: "share456",
            updatedAt: "2026-05-28T00:04:00.000Z",
        });
        expect(getLocalRecord(record.id)).toEqual(savedRecord);
    });
});
