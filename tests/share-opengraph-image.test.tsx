import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabaseAdmin = vi.hoisted(() => ({
    from: vi.fn(),
}));

vi.mock("../lib/supabaseAdmin", () => ({
    supabaseAdmin: mockSupabaseAdmin,
}));

import Image from "../app/shares/[slug]/opengraph-image";

beforeEach(() => {
    mockSupabaseAdmin.from.mockReset();
});

function createSelectResult(result: unknown) {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(result),
    };
}

describe("/shares/[slug]/opengraph-image", () => {
    it("renders a generated preview image for a share", async () => {
        const query = createSelectResult({
            data: {
                slug: "share123",
                source_kind: "game",
                board_size: 19,
                game_state: {
                    setupStones: [],
                    moves: [{ type: "play", x: 3, y: 3, color: "B" }],
                    currentPlayer: "W",
                },
                black_player_name: "Black",
                white_player_name: "White",
                handicap: 0,
                created_at: "2026-05-29T00:00:00.000Z",
            },
            error: null,
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(query);

        const response = await Image({
            params: Promise.resolve({
                slug: "share123",
            }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/png");
        expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
        expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("shares");
        expect(query.select).toHaveBeenCalledWith("*");
        expect(query.eq).toHaveBeenCalledWith("slug", "share123");
        expect(query.maybeSingle).toHaveBeenCalled();
    });


    it("renders without text details when player names are missing", async () => {
        const query = createSelectResult({
            data: {
                slug: "share456",
                source_kind: "game",
                board_size: 9,
                game_state: {
                    setupStones: [],
                    moves: [{ type: "play", x: 2, y: 2, color: "B" }],
                    currentPlayer: "W",
                },
                black_player_name: null,
                white_player_name: null,
                handicap: 0,
                created_at: "2026-05-29T00:00:00.000Z",
            },
            error: null,
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(query);

        const response = await Image({
            params: Promise.resolve({
                slug: "share456",
            }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/png");
        expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
    });

    it("returns 404 when the share is missing", async () => {
        const query = createSelectResult({
            data: null,
            error: null,
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(query);

        const response = await Image({
            params: Promise.resolve({
                slug: "missing",
            }),
        });

        expect(response.status).toBe(404);
        expect(await response.text()).toBe("Share not found");
    });
});
