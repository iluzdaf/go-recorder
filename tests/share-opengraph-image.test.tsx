import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabaseAdmin = vi.hoisted(() => ({
    from: vi.fn(),
}));

vi.mock("../lib/supabaseAdmin", () => ({
    supabaseAdmin: mockSupabaseAdmin,
}));

import Image, {
    getBoardCoordinatePadding,
    getCoordinateFontSize,
    getGoColumnLabel,
    getGoRowLabel,
} from "../app/shares/[slug]/opengraph-image";

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

function createEmptySignMap(boardSize: number) {
    return Array.from({ length: boardSize }, () =>
        Array.from({ length: boardSize }, () => 0)
    );
}

describe("/shares/[slug]/opengraph-image", () => {
    it("formats board coordinate labels", () => {
        expect(getGoColumnLabel(0)).toBe("A");
        expect(getGoColumnLabel(7)).toBe("H");
        expect(getGoColumnLabel(8)).toBe("J");
        expect(getGoColumnLabel(18)).toBe("T");
        expect(getGoRowLabel({ boardSize: 19, y: 0 })).toBe("19");
        expect(getGoRowLabel({ boardSize: 19, y: 18 })).toBe("1");
    });

    it("scales board coordinate size from stone radius", () => {
        expect(getCoordinateFontSize(10)).toBe(16);
        expect(getCoordinateFontSize(28)).toBeCloseTo(25.2);
        expect(getCoordinateFontSize(40)).toBe(34);
    });

    it("adds more coordinate gutter for smaller visible board views", () => {
        expect(getBoardCoordinatePadding(6)).toBe(76);
        expect(getBoardCoordinatePadding(9)).toBe(76);
        expect(getBoardCoordinatePadding(13)).toBe(56);
        expect(getBoardCoordinatePadding(19)).toBe(36);
    });

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
        expect(response.headers.get("Cache-Control")).toBe(
            "public, max-age=31536000, immutable"
        );
        expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
        expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("shares");
        expect(query.select).toHaveBeenCalledWith("*");
        expect(query.eq).toHaveBeenCalledWith("slug", "share123");
        expect(query.maybeSingle).toHaveBeenCalled();
    });

    it("renders from cached final position when available", async () => {
        const finalPosition = createEmptySignMap(9);
        finalPosition[2][2] = 1;

        const query = createSelectResult({
            data: {
                slug: "share321",
                source_kind: "game",
                board_size: 9,
                game_state: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 2, y: 2, color: "B" },
                        { type: "play", x: 2, y: 2, color: "W" },
                    ],
                    currentPlayer: "B",
                },
                final_position: finalPosition,
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
                slug: "share321",
            }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe(
            "public, max-age=31536000, immutable"
        );
        expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
    });

    it("renders variation move number previews", async () => {
        const finalPosition = createEmptySignMap(9);
        finalPosition[2][2] = 1;
        finalPosition[3][3] = -1;

        const query = createSelectResult({
            data: {
                slug: "share654",
                source_kind: "draft",
                draft_kind: "variation",
                parent_share_slug: "parent123",
                base_move_count: 1,
                board_size: 9,
                game_state: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 2, y: 2, color: "B" },
                        { type: "play", x: 3, y: 3, color: "W" },
                    ],
                    currentPlayer: "B",
                },
                final_position: finalPosition,
                position_view: {
                    anchor: "top-left",
                    rows: 6,
                    columns: 8,
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
                slug: "share654",
            }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe(
            "public, max-age=31536000, immutable"
        );
        expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
    });

    it("renders cropped board position previews", async () => {
        const finalPosition = createEmptySignMap(19);
        finalPosition[0][0] = 1;
        finalPosition[5][7] = -1;
        finalPosition[18][18] = 1;

        const query = createSelectResult({
            data: {
                slug: "share987",
                source_kind: "draft",
                draft_kind: "board",
                board_size: 19,
                game_state: {
                    setupStones: [
                        { x: 0, y: 0, color: "B" },
                        { x: 7, y: 5, color: "W" },
                        { x: 18, y: 18, color: "B" },
                    ],
                    moves: [],
                    currentPlayer: "B",
                },
                final_position: finalPosition,
                position_view: {
                    anchor: "top-left",
                    rows: 6,
                    columns: 8,
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
                slug: "share987",
            }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe(
            "public, max-age=31536000, immutable"
        );
        expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
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
        expect(response.headers.get("Cache-Control")).toBe(
            "public, max-age=31536000, immutable"
        );
        expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
    });

    it("does not cache fallback images for invalid old shares", async () => {
        const query = createSelectResult({
            data: {
                slug: "share789",
                source_kind: "game",
                board_size: 9,
                game_state: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 2, y: 2, color: "B" },
                        { type: "play", x: 2, y: 2, color: "W" },
                    ],
                    currentPlayer: "B",
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
                slug: "share789",
            }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
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
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(await response.text()).toBe("Share not found");
    });
});
