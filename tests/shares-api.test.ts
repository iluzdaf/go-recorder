import { beforeEach, describe, expect, it, vi } from "vitest";

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
                board_size: 19,
                game_state: validShareInput.gameState,
                black_player_name: "Black",
                white_player_name: null,
                handicap: 0,
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
            error: "Invalid share input",
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
