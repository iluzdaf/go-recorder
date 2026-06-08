import { beforeEach, describe, expect, it, vi } from "vitest";

import { t } from "../lib/i18n";

const mockSupabaseAdmin = vi.hoisted(() => ({
    from: vi.fn(),
}));

vi.mock("../lib/supabaseAdmin", () => ({
    supabaseAdmin: mockSupabaseAdmin,
}));

import { GET } from "../app/api/shares/[slug]/route";
import { POST } from "../app/api/shares/route";

const validShareInput = {
    sourceKind: "game",
    boardSize: 19,
    gameState: {
        setupStones: [],
        moves: [{ type: "play", x: 3, y: 3, color: "B" }],
        currentPlayer: "W",
    },
    blackPlayerName: "Black",
    whitePlayerName: null,
    handicap: 0,
};

beforeEach(() => {
    mockSupabaseAdmin.from.mockReset();
});

function createInsertResult(result: unknown) {
    return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(result),
    };
}

function createSelectResult(result: unknown) {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(result),
    };
}

function createJsonRequest(body: unknown) {
    return new Request("http://localhost/api/shares", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
}

describe("POST /api/shares", () => {
    it("creates a share", async () => {
        const insertQuery = createInsertResult({
            data: {
                slug: "share123",
            },
            error: null,
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(insertQuery);

        const response = await POST(createJsonRequest(validShareInput));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            slug: "share123",
        });
        expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("shares");
        expect(insertQuery.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                slug: expect.any(String),
                source_kind: "game",
                draft_kind: null,
                board_size: 19,
                game_state: validShareInput.gameState,
                final_position: expect.any(Array),
                black_player_name: "Black",
                white_player_name: null,
                handicap: 0,
                parent_share_slug: null,
                base_move_count: null,
            })
        );
        const insertedShare = insertQuery.insert.mock.calls[0]?.[0];
        expect(insertedShare.final_position).toHaveLength(19);
        expect(insertedShare.final_position[3][3]).toBe(1);
    });

    it("rejects share input with illegal replay state", async () => {
        const response = await POST(
            createJsonRequest({
                ...validShareInput,
                gameState: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 3, y: 3, color: "B" },
                        { type: "play", x: 3, y: 3, color: "W" },
                    ],
                    currentPlayer: "B",
                },
            })
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: t("invalidShareInput"),
        });
        expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
    });

    it("creates a variation draft share with draft metadata", async () => {
        const insertQuery = createInsertResult({
            data: {
                slug: "share123",
            },
            error: null,
        });
        const variationShareInput = {
            ...validShareInput,
            sourceKind: "draft",
            draftKind: "variation",
            parentShareSlug: "parent123",
            baseMoveCount: 1,
        };

        mockSupabaseAdmin.from.mockReturnValueOnce(insertQuery);

        const response = await POST(createJsonRequest(variationShareInput));

        expect(response.status).toBe(200);
        expect(insertQuery.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                source_kind: "draft",
                draft_kind: "variation",
                parent_share_slug: "parent123",
                base_move_count: 1,
            })
        );
    });

    it("rejects invalid share input", async () => {
        const response = await POST(
            createJsonRequest({
                ...validShareInput,
                boardSize: 15,
            })
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: t("invalidShareInput"),
        });
        expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
    });

    it("returns 500 when share creation fails", async () => {
        const insertQuery = createInsertResult({
            data: null,
            error: {
                message: "Insert failed",
            },
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(insertQuery);

        const response = await POST(createJsonRequest(validShareInput));

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "Insert failed",
        });
    });
});

describe("GET /api/shares/[slug]", () => {
    it("returns a share", async () => {
        const selectQuery = createSelectResult({
            data: {
                slug: "share123",
                source_kind: "game",
                board_size: 19,
                game_state: validShareInput.gameState,
                black_player_name: "Black",
                white_player_name: null,
                handicap: 0,
                created_at: "2026-05-29T00:00:00.000Z",
            },
            error: null,
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(selectQuery);

        const response = await GET(new Request("http://localhost/api/shares/share123"), {
            params: Promise.resolve({
                slug: "share123",
            }),
        });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            slug: "share123",
            source_kind: "game",
            board_size: 19,
            game_state: validShareInput.gameState,
            black_player_name: "Black",
            white_player_name: null,
            handicap: 0,
            created_at: "2026-05-29T00:00:00.000Z",
        });
        expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("shares");
        expect(selectQuery.select).toHaveBeenCalledWith("*");
        expect(selectQuery.eq).toHaveBeenCalledWith("slug", "share123");
    });

    it("returns 404 when the share does not exist", async () => {
        const selectQuery = createSelectResult({
            data: null,
            error: {
                message: "Share not found",
            },
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(selectQuery);

        const response = await GET(new Request("http://localhost/api/shares/missing"), {
            params: Promise.resolve({
                slug: "missing",
            }),
        });

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            error: "Share not found",
        });
    });
});
