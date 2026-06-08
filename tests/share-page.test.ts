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
    process.env.NEXT_PUBLIC_SITE_URL = "go-recorder-ten.vercel.app";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "go-recorder.vercel.app";
    process.env.VERCEL_URL = "go-recorder-preview.vercel.app";
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
            draftKind: null,
            boardSize: 19,
            gameState: {
                setupStones: [],
                moves: [{ type: "play", x: 3, y: 3, color: "B" }],
                currentPlayer: "W",
            },
            finalPosition: null,
            blackPlayerName: "Black",
            whitePlayerName: null,
            handicap: 0,
            parentShareSlug: null,
            baseMoveCount: null,
            positionView: null,
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
            description: "View this shared Go game",
            openGraph: {
                title: "Black vs White",
                description: "View this shared Go game",
                images: [
                    {
                        url: "https://go-recorder-preview.vercel.app/shares/share123/opengraph-image",
                        width: 1200,
                        height: 630,
                        alt: "Shared Go game final position",
                        type: "image/png",
                    },
                ],
            },
            twitter: {
                card: "summary_large_image",
                title: "Black vs White",
                description: "View this shared Go game",
                images: [
                    "https://go-recorder-preview.vercel.app/shares/share123/opengraph-image",
                ],
            },
        });
        expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("shares");
        expect(query.select).toHaveBeenCalledWith("*");
        expect(query.eq).toHaveBeenCalledWith("slug", "share123");
        expect(query.maybeSingle).toHaveBeenCalled();
    });


    it("uses the production Vercel URL for production deployments", async () => {
        process.env.VERCEL_ENV = "production";
        delete process.env.NEXT_PUBLIC_SITE_URL;
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

        expect(metadata.openGraph).toMatchObject({
            images: [
                {
                    url: "https://go-recorder.vercel.app/shares/share123/opengraph-image",
                },
            ],
        });
    });


    it("uses the configured site URL outside preview deployments", async () => {
        process.env.VERCEL_ENV = "production";
        process.env.NEXT_PUBLIC_SITE_URL = "https://go-recorder.example.com";
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

        expect(metadata.openGraph).toMatchObject({
            images: [
                {
                    url: "https://go-recorder.example.com/shares/share123/opengraph-image",
                },
            ],
        });
    });

    it("uses one player name when only one player name is present", async () => {
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

        const metadata = await generateMetadata({
            params: Promise.resolve({
                slug: "share123",
            }),
        });

        expect(metadata.title).toBe("Black");
        expect(metadata.openGraph).toMatchObject({
            title: "Black",
        });
        expect(metadata.twitter).toMatchObject({
            title: "Black",
        });
    });

    it("uses generic game metadata titles when player names are missing", async () => {
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
        expect(metadata.description).toBe("View this shared Go game");
    });

    it("uses Shared Go position metadata titles for board draft shares", async () => {
        const query = createSelectResult({
            data: {
                slug: "share123",
                source_kind: "draft",
                draft_kind: "board",
                board_size: 19,
                game_state: {
                    setupStones: [{ x: 3, y: 3, color: "B" }],
                    moves: [],
                    currentPlayer: "B",
                },
                black_player_name: "Black",
                white_player_name: "White",
                handicap: 0,
                parent_share_slug: null,
                base_move_count: null,
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

        expect(metadata.title).toBe("Black vs White");
        expect(metadata.description).toBe("View this shared Go game position");
        expect(metadata.openGraph).toMatchObject({
            title: "Black vs White",
            description: "View this shared Go game position",
        });
        expect(metadata.twitter).toMatchObject({
            title: "Black vs White",
            description: "View this shared Go game position",
        });
    });

    it("uses generic draft metadata titles when player names are missing", async () => {
        const query = createSelectResult({
            data: {
                slug: "share123",
                source_kind: "draft",
                draft_kind: "board",
                board_size: 19,
                game_state: {
                    setupStones: [{ x: 3, y: 3, color: "B" }],
                    moves: [],
                    currentPlayer: "B",
                },
                black_player_name: null,
                white_player_name: null,
                handicap: 0,
                parent_share_slug: null,
                base_move_count: null,
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

        expect(metadata.title).toBe("Shared Go position");
        expect(metadata.description).toBe("View this shared Go game position");
    });

    it("uses variation metadata descriptions for variation draft shares", async () => {
        const query = createSelectResult({
            data: {
                slug: "share123",
                source_kind: "draft",
                draft_kind: "variation",
                board_size: 19,
                game_state: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 3, y: 3, color: "B" },
                        { type: "play", x: 4, y: 4, color: "W" },
                    ],
                    currentPlayer: "B",
                },
                black_player_name: null,
                white_player_name: null,
                handicap: 0,
                parent_share_slug: "parent123",
                base_move_count: 1,
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

        expect(metadata.title).toBe("Shared Go variation");
        expect(metadata.description).toBe("View this shared Go variation");
        expect(metadata.openGraph).toMatchObject({
            title: "Shared Go variation",
            description: "View this shared Go variation",
        });
        expect(metadata.twitter).toMatchObject({
            title: "Shared Go variation",
            description: "View this shared Go variation",
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
