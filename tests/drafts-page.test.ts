import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalDraft, createLocalGame, getAllLocalDrafts, deleteLocalRecord } from "../lib/localGames";
import type { CreateLocalDraftInput } from "../lib/localGames";
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

const BASE_DRAFT: CreateLocalDraftInput = {
    draftKind: "board",
    boardSize: 19,
    gameState: { setupStones: [], moves: [], currentPlayer: "B" },
    blackPlayerName: "Alice",
    whitePlayerName: "Bob",
    handicap: 0,
    parentShareSlug: null,
    baseMoveCount: null,
};

beforeEach(() => {
    vi.stubGlobal("window", {
        dispatchEvent: vi.fn(),
        localStorage: createStorageMock(),
    });
});

describe("getAllLocalDrafts", () => {
    it("returns an empty list when there are no drafts", () => {
        expect(getAllLocalDrafts()).toEqual([]);
    });

    it("returns drafts sorted newest-first by updatedAt", () => {
        const first = createLocalDraft(BASE_DRAFT);
        const second = createLocalDraft({ ...BASE_DRAFT, blackPlayerName: "Carol" });

        const drafts = getAllLocalDrafts();

        expect(drafts[0].id).toBe(second.id);
        expect(drafts[1].id).toBe(first.id);
    });

    it("excludes game records", () => {
        createLocalDraft(BASE_DRAFT);
        createLocalGame({
            boardSize: 19,
            gameState: { setupStones: [], moves: [], currentPlayer: "B" },
            blackPlayerName: "Alice",
            whitePlayerName: "Bob",
            handicap: 0,
        });

        const drafts = getAllLocalDrafts();

        expect(drafts).toHaveLength(1);
        expect(drafts[0].recordKind).toBe("draft");
    });

    it("includes both board and variation drafts", () => {
        createLocalDraft(BASE_DRAFT);
        createLocalDraft({
            draftKind: "variation",
            boardSize: 19,
            gameState: { setupStones: [], moves: [], currentPlayer: "B" },
            blackPlayerName: null,
            whitePlayerName: null,
            handicap: 0,
            parentShareSlug: "some-share",
            baseMoveCount: 5,
        });

        expect(getAllLocalDrafts()).toHaveLength(2);
    });

    it("skips malformed entries", () => {
        window.localStorage.setItem("go-recorder:local-game:broken", "{bad json");

        expect(getAllLocalDrafts()).toHaveLength(0);
    });
});

describe("deleteLocalRecord (drafts)", () => {
    it("removes the draft from storage", () => {
        const draft = createLocalDraft(BASE_DRAFT);

        deleteLocalRecord(draft.id);

        expect(getAllLocalDrafts()).toHaveLength(0);
    });

    it("is a no-op for unknown ids", () => {
        createLocalDraft(BASE_DRAFT);

        deleteLocalRecord("does-not-exist");

        expect(getAllLocalDrafts()).toHaveLength(1);
    });

    it("removes the draft immediately and notifies recent-list surfaces", () => {
        const draft = createLocalDraft(BASE_DRAFT);

        deleteLocalEditableRecord(draft.id);

        expect(getAllLocalDrafts()).toEqual([]);
        expect(window.dispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                type: LOCAL_DATA_MIGRATION_CHANGE_EVENT,
            })
        );
    });
});
