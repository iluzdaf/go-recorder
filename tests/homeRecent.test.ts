import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalDraftRecord, LocalGameRecord } from "../lib/localGames";
import {
    createLocalDraft,
    createLocalGame,
    getAllLocalDrafts,
    getAllLocalGames,
} from "../lib/localGames";
import type { CreateLocalDraftInput, CreateLocalGameInput } from "../lib/localGames";
import {
    createHomeRecentPreviews,
    createLoadingHomeRecentState,
    loadHomeRecentState,
    shouldRenderHomeRecentSection,
} from "../lib/homeRecent";
import { deleteLocalEditableRecord } from "../lib/localRecordDeletion";
import type { GameState } from "../components/types";

const emptyGameState: GameState = {
    setupStones: [],
    moves: [],
    currentPlayer: "B",
};

function createGame(overrides: Partial<LocalGameRecord>): LocalGameRecord {
    return {
        recordKind: "game",
        id: "game-default",
        boardSize: 19,
        gameState: emptyGameState,
        blackPlayerName: null,
        whitePlayerName: null,
        handicap: 0,
        komi: 6.5,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
        lastShareSlug: null,
        ...overrides,
    };
}

function createDraft(overrides: Partial<LocalDraftRecord>): LocalDraftRecord {
    return {
        recordKind: "draft",
        draftKind: "board",
        id: "draft-default",
        boardSize: 19,
        gameState: emptyGameState,
        blackPlayerName: null,
        whitePlayerName: null,
        handicap: 0,
        komi: 6.5,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
        lastShareSlug: null,
        parentShareSlug: null,
        baseMoveCount: null,
        positionView: null,
        imageSourceId: null,
        ...overrides,
    };
}

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

const BASE_LOCAL_GAME: CreateLocalGameInput = {
    boardSize: 19,
    gameState: emptyGameState,
    blackPlayerName: "Home Black",
    whitePlayerName: "Home White",
    handicap: 0,
};

const BASE_LOCAL_DRAFT: CreateLocalDraftInput = {
    draftKind: "board",
    boardSize: 19,
    gameState: emptyGameState,
    blackPlayerName: "Draft Black",
    whitePlayerName: "Draft White",
    handicap: 0,
    parentShareSlug: null,
    baseMoveCount: null,
};

describe("home recent state", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("starts with a loading state that reserves recent section space", () => {
        const state = createLoadingHomeRecentState();

        expect(state).toEqual({
            status: "loading",
            games: [],
            drafts: [],
        });
        expect(shouldRenderHomeRecentSection(state, state.games)).toBe(true);
        expect(shouldRenderHomeRecentSection(state, state.drafts)).toBe(true);
    });

    it("loads seeded recent games and drafts with the home limit", () => {
        const games = [
            createGame({ id: "game-1" }),
            createGame({ id: "game-2" }),
            createGame({ id: "game-3" }),
            createGame({ id: "game-4" }),
        ];
        const drafts = [
            createDraft({ id: "draft-1" }),
            createDraft({ id: "draft-2" }),
            createDraft({ id: "draft-3" }),
            createDraft({ id: "draft-4" }),
        ];

        const state = loadHomeRecentState({
            loadGames: () => games,
            loadDrafts: () => drafts,
        });

        expect(state.status).toBe("ready");
        expect(state.games.map((game) => game.id)).toEqual([
            "game-1",
            "game-2",
            "game-3",
        ]);
        expect(state.drafts.map((draft) => draft.id)).toEqual([
            "draft-1",
            "draft-2",
            "draft-3",
        ]);
    });

    it("does not keep empty recent sections reserved after loading", () => {
        const state = loadHomeRecentState({
            loadGames: () => [],
            loadDrafts: () => [],
        });

        expect(state.status).toBe("ready");
        expect(shouldRenderHomeRecentSection(state, state.games)).toBe(false);
        expect(shouldRenderHomeRecentSection(state, state.drafts)).toBe(false);
    });

    it("uses id and updatedAt as the stable preview key", () => {
        const previews = createHomeRecentPreviews(
            [
                createGame({
                    id: "game-1",
                    updatedAt: "2026-06-02T00:00:00.000Z",
                    blackPlayerName: "Black",
                    whitePlayerName: "White",
                }),
            ],
            (game) => `${game.blackPlayerName} vs ${game.whitePlayerName}`
        );

        expect(previews).toEqual([
            {
                previewKey: "game-1:2026-06-02T00:00:00.000Z",
                record: expect.objectContaining({ id: "game-1" }),
                title: "Black vs White",
            },
        ]);
    });

    it("refreshes from the latest local data source when reloaded after migration", () => {
        const loadGames = vi
            .fn<() => LocalGameRecord[]>()
            .mockReturnValueOnce([])
            .mockReturnValueOnce([createGame({ id: "imported-game" })]);
        const loadDrafts = vi
            .fn<() => LocalDraftRecord[]>()
            .mockReturnValueOnce([])
            .mockReturnValueOnce([createDraft({ id: "imported-draft" })]);

        expect(loadHomeRecentState({ loadGames, loadDrafts }).games).toEqual([]);

        const refreshed = loadHomeRecentState({ loadGames, loadDrafts });

        expect(refreshed.games.map((game) => game.id)).toEqual([
            "imported-game",
        ]);
        expect(refreshed.drafts.map((draft) => draft.id)).toEqual([
            "imported-draft",
        ]);
    });

    it("drops deleted games and drafts when reloaded from local storage", () => {
        vi.stubGlobal("window", {
            dispatchEvent: vi.fn(),
            localStorage: createStorageMock(),
        });
        const game = createLocalGame(BASE_LOCAL_GAME);
        const draft = createLocalDraft(BASE_LOCAL_DRAFT);

        expect(
            loadHomeRecentState({
                loadGames: getAllLocalGames,
                loadDrafts: getAllLocalDrafts,
            }).games.map((record) => record.id)
        ).toEqual([game.id]);

        deleteLocalEditableRecord(game.id);
        deleteLocalEditableRecord(draft.id);

        const refreshed = loadHomeRecentState({
            loadGames: getAllLocalGames,
            loadDrafts: getAllLocalDrafts,
        });

        expect(refreshed.games).toEqual([]);
        expect(refreshed.drafts).toEqual([]);
    });
});
