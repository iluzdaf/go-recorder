import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabaseAdmin = vi.hoisted(() => ({
    from: vi.fn(),
}));

vi.mock("../lib/supabaseAdmin", () => ({
    supabaseAdmin: mockSupabaseAdmin,
}));

import { saveGame } from "../lib/games";

beforeEach(() => {
    mockSupabaseAdmin.from.mockReset();
});

function createSingleResult(result: unknown) {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(result),
    };
}

function createUpdateResult(result: unknown) {
    return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(result),
    };
}

function createInsertResult(result: unknown) {
    return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(result),
    };
}



describe("saveGame", () => {
    it("updates the existing game when updatedAt matches", async () => {
        const existingGameQuery = createSingleResult({
            data: {
                updated_at: "2026-05-25T00:00:00.000Z",
            },
            error: null,
        });

        const updateQuery = createUpdateResult({
            data: {
                slug: "abc12345",
                board_size: 19,
                game_state: {
                    moves: [],
                    currentPlayer: "B",
                },
                updated_at: "2026-05-25T00:01:00.000Z",
            },
            error: null,
        });

        mockSupabaseAdmin.from
            .mockReturnValueOnce(existingGameQuery)
            .mockReturnValueOnce(updateQuery);

        const result = await saveGame({
            slug: "abc12345",
            boardSize: 19,
            gameState: {
                moves: [],
                currentPlayer: "B",
            },
            updatedAt: "2026-05-25T00:00:00.000Z",
        });

        expect(result.status).toBe(200);
        expect(result.body).toMatchObject({
            slug: "abc12345",
            board_size: 19,
        });
        expect(updateQuery.update).toHaveBeenCalledWith(
            expect.objectContaining({
                board_size: 19,
                game_state: {
                    moves: [],
                    currentPlayer: "B",
                },
            })
        );
        expect(mockSupabaseAdmin.from).toHaveBeenCalledTimes(2);
        expect(updateQuery.update).toHaveBeenCalled();
    });

    it("forks to a new game when updatedAt does not match", async () => {
        const existingGameQuery = createSingleResult({
            data: {
                updated_at: "2026-05-25T00:01:00.000Z",
            },
            error: null,
        });

        const insertQuery = createInsertResult({
            data: {
                slug: "forked01",
            },
            error: null,
        });

        mockSupabaseAdmin.from
            .mockReturnValueOnce(existingGameQuery)
            .mockReturnValueOnce(insertQuery);

        const result = await saveGame({
            slug: "abc12345",
            boardSize: 19,
            gameState: {
                moves: [],
                currentPlayer: "B",
            },
            updatedAt: "2026-05-25T00:00:00.000Z",
        });

        expect(result.status).toBe(409);
        expect(result.body).toMatchObject({
            error: "Game was updated elsewhere",
            newSlug: "forked01",
        });
        expect(insertQuery.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                slug: expect.any(String),
                board_size: 19,
                game_state: {
                    moves: [],
                    currentPlayer: "B",
                },
            })
        );
        expect(mockSupabaseAdmin.from).toHaveBeenCalledTimes(2);
        expect(insertQuery.insert).toHaveBeenCalled();
    });

    it("returns 500 when updating the existing game fails", async () => {
        const existingGameQuery = createSingleResult({
            data: {
                updated_at: "2026-05-25T00:00:00.000Z",
            },
            error: null,
        });

        const updateQuery = createUpdateResult({
            data: null,
            error: {
                message: "Update failed",
            },
        });

        mockSupabaseAdmin.from
            .mockReturnValueOnce(existingGameQuery)
            .mockReturnValueOnce(updateQuery);

        const result = await saveGame({
            slug: "abc12345",
            boardSize: 19,
            gameState: {
                moves: [],
                currentPlayer: "B",
            },
            updatedAt: "2026-05-25T00:00:00.000Z",
        });

        expect(result.status).toBe(500);
        expect(result.body).toEqual({
            error: "Update failed",
        });
        expect(updateQuery.update).toHaveBeenCalled();
    });

    it("returns 500 when creating a forked game fails", async () => {
        const existingGameQuery = createSingleResult({
            data: {
                updated_at: "2026-05-25T00:01:00.000Z",
            },
            error: null,
        });

        const insertQuery = createInsertResult({
            data: null,
            error: {
                message: "Insert failed",
            },
        });

        mockSupabaseAdmin.from
            .mockReturnValueOnce(existingGameQuery)
            .mockReturnValueOnce(insertQuery);

        const result = await saveGame({
            slug: "abc12345",
            boardSize: 19,
            gameState: {
                moves: [],
                currentPlayer: "B",
            },
            updatedAt: "2026-05-25T00:00:00.000Z",
        });

        expect(result.status).toBe(500);
        expect(result.body).toEqual({
            error: "Insert failed",
        });
        expect(insertQuery.insert).toHaveBeenCalled();
    });

    it("returns 404 when the game cannot be found", async () => {
        const existingGameQuery = createSingleResult({
            data: null,
            error: {
                message: "Game not found",
            },
        });

        mockSupabaseAdmin.from.mockReturnValueOnce(existingGameQuery);

        const result = await saveGame({
            slug: "missing1",
            boardSize: 19,
            gameState: {
                moves: [],
                currentPlayer: "B",
            },
            updatedAt: "2026-05-25T00:00:00.000Z",
        });

        expect(result.status).toBe(404);
        expect(result.body).toEqual({
            error: "Game not found",
        });
    });
});