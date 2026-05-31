import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSupabaseAdmin = vi.hoisted(() => ({
    from: vi.fn(),
}));

const mockNotFound = vi.hoisted(() =>
    vi.fn(() => {
        throw new Error("NOT_FOUND");
    })
);

vi.mock("../lib/supabaseAdmin", () => ({
    supabaseAdmin: mockSupabaseAdmin,
}));

vi.mock("next/navigation", () => ({
    notFound: mockNotFound,
}));

import SharePage from "../app/shares/[slug]/page";

beforeEach(() => {
    mockSupabaseAdmin.from.mockReset();
    mockNotFound.mockClear();
});

function createSelectResult(result: unknown) {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(result),
    };
}

describe("/shares/[slug] page", () => {
    it("renders a share viewer", async () => {
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
                white_player_name: null,
                handicap: 0,
                created_at: "2026-05-29T00:00:00.000Z",
            },
            error: null,
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(query);

        const tree = await SharePage({
            params: Promise.resolve({
                slug: "share123",
            }),
        });

        expect(tree.type).toBe("main");
        expect(tree.props.children.props.share).toEqual({
            slug: "share123",
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
            createdAt: "2026-05-29T00:00:00.000Z",
        });
        expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("shares");
        expect(query.select).toHaveBeenCalledWith("*");
        expect(query.eq).toHaveBeenCalledWith("slug", "share123");
        expect(query.maybeSingle).toHaveBeenCalled();
    });

    it("returns not found when the share is missing", async () => {
        const query = createSelectResult({
            data: null,
            error: null,
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(query);

        await expect(
            SharePage({
                params: Promise.resolve({
                    slug: "missing",
                }),
            })
        ).rejects.toThrow("NOT_FOUND");

        expect(mockNotFound).toHaveBeenCalled();
    });
});
