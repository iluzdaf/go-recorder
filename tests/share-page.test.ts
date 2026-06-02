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

import SharePage, { generateMetadata } from "../app/shares/[slug]/page";

beforeEach(() => {
    mockSupabaseAdmin.from.mockReset();
    mockNotFound.mockClear();
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = "go-recorder.vercel.app";
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


    it("generates share Open Graph metadata", async () => {
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

        const metadata = await generateMetadata({
            params: Promise.resolve({
                slug: "share123",
            }),
        });

        expect(metadata).toEqual({
            title: "Black vs White",
            description: "View this shared Go game position.",
            openGraph: {
                title: "Black vs White",
                description: "View this shared Go game position.",
                images: [
                    {
                        url: "https://go-recorder.vercel.app/shares/share123/opengraph-image",
                        width: 1200,
                        height: 630,
                        alt: "Shared Go game final position",
                    },
                ],
            },
            twitter: {
                card: "summary_large_image",
                title: "Black vs White",
                description: "View this shared Go game position.",
                images: [
                    "https://go-recorder.vercel.app/shares/share123/opengraph-image",
                ],
            },
        });
        expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("shares");
        expect(query.select).toHaveBeenCalledWith("*");
        expect(query.eq).toHaveBeenCalledWith("slug", "share123");
        expect(query.maybeSingle).toHaveBeenCalled();
    });

    it("uses generic metadata titles when player names are missing", async () => {
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
                black_player_name: null,
                white_player_name: null,
                handicap: 0,
                created_at: "2026-05-29T00:00:00.000Z",
            },
            error: null,
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(query);

        const metadata = await generateMetadata({
            params: Promise.resolve({
                slug: "share123",
            }),
        });

        expect(metadata.title).toBe("Shared Go game");
        expect(metadata.openGraph).toMatchObject({
            title: "Shared Go game",
        });
        expect(metadata.twitter).toMatchObject({
            title: "Shared Go game",
        });
    });

    it("returns not found for metadata when the share is missing", async () => {
        const query = createSelectResult({
            data: null,
            error: null,
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(query);

        await expect(
            generateMetadata({
                params: Promise.resolve({
                    slug: "missing",
                }),
            })
        ).rejects.toThrow("NOT_FOUND");

        expect(mockNotFound).toHaveBeenCalled();
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
