import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalGame, getAllLocalGames, deleteLocalRecord } from "../lib/localGames";
import type { CreateLocalGameInput } from "../lib/localGames";
import { LOCAL_DATA_MIGRATION_CHANGE_EVENT } from "../lib/localDataMigration";
import { deleteLocalEditableRecord } from "../lib/localRecordDeletion";

function createStorageMock() {
    const items = new Map<string, string>();

    return {
        clear: vi.fn(() => { items.clear(); }),
        getItem: vi.fn((key: string) => items.get(key) ?? null),
        key: vi.fn((index: number) => Array.from(items.keys())[index] ?? null),
        removeItem: vi.fn((key: string) => { items.delete(key); }),
        setItem: vi.fn((key: string, value: string) => { items.set(key, value); }),
        get length() { return items.size; },
    };
}

const BASE_GAME: CreateLocalGameInput = {
    boardSize: 19,
    gameState: { setupStones: [], moves: [], currentPlayer: "B" },
    blackPlayerName: "Alice",
    whitePlayerName: "Bob",
    handicap: 0,
};

beforeEach(() => {
    vi.stubGlobal("window", {
        dispatchEvent: vi.fn(),
        localStorage: createStorageMock(),
    });
});

describe("getAllLocalGames", () => {
    it("returns an empty list when there are no games", () => {
        expect(getAllLocalGames()).toEqual([]);
    });

    it("returns games sorted newest-first by updatedAt", () => {
        const first = createLocalGame(BASE_GAME);
        const second = createLocalGame({ ...BASE_GAME, blackPlayerName: "Carol" });

        const games = getAllLocalGames();

        expect(games[0].id).toBe(second.id);
        expect(games[1].id).toBe(first.id);
    });

    it("excludes draft records", () => {
        createLocalGame(BASE_GAME);

        window.localStorage.setItem(
            "go-recorder:local-game:draft-only",
            JSON.stringify({
                recordKind: "draft",
                draftKind: "board",
                id: "draft-only",
                boardSize: 19,
                gameState: { setupStones: [], moves: [], currentPlayer: "B" },
                blackPlayerName: null,
                whitePlayerName: null,
                handicap: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastShareSlug: null,
                parentShareSlug: null,
                baseMoveCount: null,
            })
        );

        const games = getAllLocalGames();

        expect(games).toHaveLength(1);
        expect(games[0].recordKind).not.toBe("draft");
    });

    it("skips malformed entries", () => {
        window.localStorage.setItem("go-recorder:local-game:broken", "{bad json");

        expect(getAllLocalGames()).toHaveLength(0);
    });
});

describe("deleteLocalRecord", () => {
    it("removes the game from storage", () => {
        const game = createLocalGame(BASE_GAME);

        deleteLocalRecord(game.id);

        expect(getAllLocalGames()).toHaveLength(0);
    });

    it("is a no-op for unknown ids", () => {
        createLocalGame(BASE_GAME);

        deleteLocalRecord("does-not-exist");

        expect(getAllLocalGames()).toHaveLength(1);
    });

    it("removes the game immediately and notifies recent-list surfaces", () => {
        const game = createLocalGame(BASE_GAME);

        deleteLocalEditableRecord(game.id);

        expect(getAllLocalGames()).toEqual([]);
        expect(window.dispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                type: LOCAL_DATA_MIGRATION_CHANGE_EVENT,
            })
        );
    });
});
