import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabaseAdmin = vi.hoisted(() => ({
    from: vi.fn(),
}));

vi.mock("../lib/supabaseAdmin", () => ({
    getSupabaseAdmin: () => mockSupabaseAdmin,
}));

// Pass through the data cache so the lookup runs against the Supabase mock on
// every call; the caching layer is exercised at runtime, not in this unit test.
vi.mock("next/cache", () => ({
    unstable_cache: <T,>(fn: T) => fn,
}));

import { getShareBySlug } from "../lib/shareLookup";

beforeEach(() => {
    mockSupabaseAdmin.from.mockReset();
    delete process.env.SHARE_PAGE_TIMING;
});

function createSelectResult(result: unknown) {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(result),
    };
}

describe("getShareBySlug", () => {
    it("loads and maps a Supabase share row", async () => {
        const query = createSelectResult({
            data: {
                slug: "lookup-ok",
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

        await expect(getShareBySlug("lookup-ok")).resolves.toMatchObject({
            ok: true,
            share: {
                slug: "lookup-ok",
                sourceKind: "game",
                boardSize: 19,
            },
        });
        expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("shares");
        expect(query.select).toHaveBeenCalledWith("*");
        expect(query.eq).toHaveBeenCalledWith("slug", "lookup-ok");
        expect(query.maybeSingle).toHaveBeenCalled();
    });

    it("returns a missing result without throwing when no share exists", async () => {
        const query = createSelectResult({
            data: null,
            error: null,
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(query);

        await expect(getShareBySlug("lookup-missing")).resolves.toMatchObject({
            ok: false,
            error: null,
        });
    });

    it("returns an error result for Supabase errors", async () => {
        const query = createSelectResult({
            data: null,
            error: { message: "lookup failed" },
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(query);

        const result = await getShareBySlug("lookup-error");

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error?.message).toBe("lookup failed");
        }
    });

    it("can log lookup timing for local performance checks", async () => {
        const query = createSelectResult({
            data: null,
            error: null,
        });
        const info = vi.spyOn(console, "info").mockImplementation(() => {});
        process.env.SHARE_PAGE_TIMING = "1";

        mockSupabaseAdmin.from.mockReturnValueOnce(query);

        await getShareBySlug("lookup-timing");

        expect(info).toHaveBeenCalledWith(
            expect.stringContaining(
                "[share-page] Supabase share lookup slug=lookup-timing"
            )
        );
        info.mockRestore();
    });
});
