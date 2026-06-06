import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalDraftRecord, LocalGameRecord } from "../components/types";
import { t } from "../lib/i18n";

const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

import {
    createShareFromLocalGame,
    toCreateShareInput,
} from "../lib/shareClient";

const localGame: LocalGameRecord = {
    id: "local-1",
    boardSize: 19,
    gameState: {
        setupStones: [{ x: 3, y: 15, color: "B" }],
        moves: [{ type: "play", x: 16, y: 3, color: "W" }],
        currentPlayer: "B",
    },
    blackPlayerName: "Black",
    whitePlayerName: "White",
    handicap: 2,
    createdAt: "2026-05-29T00:00:00.000Z",
    updatedAt: "2026-05-29T00:01:00.000Z",
};

const localDraft: LocalDraftRecord = {
    recordKind: "draft",
    draftKind: "board",
    id: "draft-1",
    boardSize: 13,
    gameState: {
        setupStones: [{ x: 3, y: 3, color: "B" }],
        moves: [],
        currentPlayer: "B",
    },
    blackPlayerName: null,
    whitePlayerName: "White",
    handicap: 0,
    createdAt: "2026-05-29T00:00:00.000Z",
    updatedAt: "2026-05-29T00:01:00.000Z",
    lastShareSlug: null,
    parentShareSlug: null,
    baseMoveCount: null,
};

beforeEach(() => {
    mockFetch.mockReset();
});

describe("toCreateShareInput", () => {
    it("maps a local game to share input", () => {
        expect(toCreateShareInput({ localGame })).toEqual({
            sourceKind: "game",
            boardSize: 19,
            gameState: localGame.gameState,
            blackPlayerName: "Black",
            whitePlayerName: "White",
            handicap: 2,
        });
    });

    it("allows overriding the source kind", () => {
        expect(
            toCreateShareInput({
                localGame,
                sourceKind: "draft",
            })
        ).toEqual({
            sourceKind: "draft",
            boardSize: 19,
            gameState: localGame.gameState,
            blackPlayerName: "Black",
            whitePlayerName: "White",
            handicap: 2,
        });
    });

    it("maps a local draft to draft share input", () => {
        expect(
            toCreateShareInput({
                localRecord: localDraft,
                sourceKind: "draft",
            })
        ).toEqual({
            sourceKind: "draft",
            boardSize: 13,
            gameState: localDraft.gameState,
            blackPlayerName: null,
            whitePlayerName: "White",
            handicap: 0,
        });
    });
});

describe("createShareFromLocalGame", () => {
    it("posts the mapped payload and returns the slug", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
                slug: "share123",
            }),
        });

        await expect(
            createShareFromLocalGame({ localGame })
        ).resolves.toEqual({
            slug: "share123",
        });

        expect(mockFetch).toHaveBeenCalledWith(
            "/api/shares",
            expect.objectContaining({
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sourceKind: "game",
                    boardSize: 19,
                    gameState: localGame.gameState,
                    blackPlayerName: "Black",
                    whitePlayerName: "White",
                    handicap: 2,
                }),
            })
        );
    });

    it("throws the API error message on failure", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: vi.fn().mockResolvedValue({
                error: "Insert failed",
            }),
        });

        await expect(
            createShareFromLocalGame({ localGame })
        ).rejects.toThrow("Insert failed");
    });

    it("throws a generic error when the API returns no message", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: vi.fn().mockResolvedValue({}),
        });

        await expect(
            createShareFromLocalGame({ localGame })
        ).rejects.toThrow(t("failedToCreateShare"));
    });
});
