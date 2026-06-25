import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GameState, ImageSourceMetadata } from "../components/types";
import { exportLocalData, importLocalDataFromText } from "../lib/localDataMigration";
import { createLocalDraft, createLocalGame, getLocalRecord } from "../lib/localGames";
import { getImageSource, storeImageSource } from "../lib/localImageStorage";

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

function createIndexedDbMock() {
    const imageSources = new Map<string, ImageSourceMetadata>();

    const store = {
        put: vi.fn((record: ImageSourceMetadata) => {
            imageSources.set(record.id, record);
            return { onerror: null as (() => void) | null };
        }),
        get: vi.fn((id: string) => {
            const request = {
                result: imageSources.get(id) ?? undefined,
                onsuccess: null as (() => void) | null,
                onerror: null as (() => void) | null,
            };

            Promise.resolve().then(() => request.onsuccess?.());
            return request;
        }),
        delete: vi.fn((id: string) => {
            imageSources.delete(id);
            return { onerror: null as (() => void) | null };
        }),
    };

    function makeTransaction() {
        const tx = {
            objectStore: vi.fn(() => store),
            oncomplete: null as (() => void) | null,
            onerror: null as (() => void) | null,
            error: null,
        };

        Promise.resolve().then(() => tx.oncomplete?.());
        return tx;
    }

    const db = {
        objectStoreNames: {
            contains: vi.fn(() => true),
        },
        createObjectStore: vi.fn(),
        transaction: vi.fn(() => makeTransaction()),
        close: vi.fn(),
    };

    const openRequest = {
        result: db,
        onupgradeneeded: null as ((event: { target: unknown }) => void) | null,
        onsuccess: null as ((event: { target: unknown }) => void) | null,
        onerror: null as (() => void) | null,
        error: null,
    };

    return {
        indexedDB: {
            open: vi.fn(() => {
                Promise.resolve().then(() => {
                    openRequest.onsuccess?.({ target: openRequest });
                });

                return openRequest;
            }),
        },
        imageSources,
    };
}

const emptyGameState: GameState = {
    setupStones: [],
    moves: [],
    currentPlayer: "B",
};

const baseImageSource: Omit<ImageSourceMetadata, "id"> = {
    dataUrl: "data:image/png;base64,abc123",
    naturalWidth: 800,
    naturalHeight: 600,
    corners: [
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.1, y: 0.9 },
    ],
};

describe("local data migration", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-24T00:00:00.000Z"));
        let randomId = 0;
        vi.stubGlobal("crypto", {
            randomUUID: vi.fn(() => `test-uuid-${++randomId}`),
        });
        vi.stubGlobal("window", {
            localStorage: createStorageMock(),
            indexedDB: createIndexedDbMock().indexedDB,
        });
    });

    it("exports local games, drafts, and referenced image sources", async () => {
        const imageSourceId = await storeImageSource(baseImageSource);
        const game = createLocalGame({
            boardSize: 19,
            gameState: emptyGameState,
        });
        const draft = createLocalDraft({
            draftKind: "board",
            boardSize: 19,
            gameState: emptyGameState,
            imageSourceId,
        });

        const payload = await exportLocalData();

        expect(payload).toMatchObject({
            version: 1,
            games: [expect.objectContaining({ id: game.id })],
            drafts: [expect.objectContaining({ id: draft.id, imageSourceId })],
            imageSources: [expect.objectContaining({ id: imageSourceId })],
            missingImageSourceIds: [],
        });
    });

    it("imports exported data with remapped ids and preserved image overlays", async () => {
        vi.stubGlobal("crypto", {
            randomUUID: vi
                .fn()
                .mockReturnValueOnce("image-source-new")
                .mockReturnValueOnce("game-new")
                .mockReturnValueOnce("draft-new"),
        });

        const payload = {
            version: 1 as const,
            exportedAt: "2026-06-24T00:00:00.000Z",
            games: [
                {
                    recordKind: "game" as const,
                    id: "game-old",
                    boardSize: 19 as const,
                    gameState: emptyGameState,
                    blackPlayerName: "Black",
                    whitePlayerName: "White",
                    handicap: 0,
                    createdAt: "2026-06-23T00:00:00.000Z",
                    updatedAt: "2026-06-23T01:00:00.000Z",
                    lastShareSlug: null,
                },
            ],
            drafts: [
                {
                    recordKind: "draft" as const,
                    draftKind: "board" as const,
                    id: "draft-old",
                    boardSize: 13 as const,
                    gameState: emptyGameState,
                    blackPlayerName: null,
                    whitePlayerName: null,
                    handicap: 0,
                    createdAt: "2026-06-23T00:00:00.000Z",
                    updatedAt: "2026-06-23T01:00:00.000Z",
                    lastShareSlug: null,
                    parentShareSlug: null,
                    baseMoveCount: null,
                    positionView: null,
                    imageSourceId: "image-source-old",
                },
            ],
            imageSources: [
                {
                    id: "image-source-old",
                    ...baseImageSource,
                },
            ],
            missingImageSourceIds: [],
        };

        const result = await importLocalDataFromText(JSON.stringify(payload));

        expect(result).toEqual({
            gamesImported: 1,
            draftsImported: 1,
            imageSourcesImported: 1,
            missingImageSourceIds: [],
        });
        expect(getLocalRecord("game-new")).toMatchObject({
            recordKind: "game",
            id: "game-new",
            blackPlayerName: "Black",
        });
        expect(getLocalRecord("draft-new")).toMatchObject({
            recordKind: "draft",
            id: "draft-new",
            imageSourceId: "image-source-new",
        });
        await expect(getImageSource("image-source-new")).resolves.toMatchObject({
            id: "image-source-new",
            ...baseImageSource,
        });
        expect(getLocalRecord("game-old")).toBeNull();
        expect(getLocalRecord("draft-old")).toBeNull();
    });

    it("rejects malformed data without writing local records", async () => {
        await expect(importLocalDataFromText("{not-json")).rejects.toThrow(
            "Invalid local data export file"
        );
        expect(window.localStorage.length).toBe(0);
    });
});
