import type { BoardSize, GameState } from "../components/types";
import { supabaseAdmin } from "./supabaseAdmin";
import { createSlug } from "./gameLogic";

type SaveGameInput = {
    slug: string;
    boardSize: BoardSize;
    gameState: GameState;
    updatedAt: string;
};

export async function saveGame({
    slug,
    boardSize,
    gameState,
    updatedAt,
}: SaveGameInput) {
    const {
        data: existingGame,
        error: existingGameError,
    } = await supabaseAdmin
        .from("games")
        .select("updated_at")
        .eq("slug", slug)
        .single();

    if (existingGameError || !existingGame) {
        return {
            status: 404,
            body: {
                error:
                    existingGameError?.message ??
                    "Game not found",
            },
        };
    }

    if (existingGame.updated_at !== updatedAt) {
        const newSlug = createSlug();

        const {
            data: forkedGame,
            error: forkError,
        } = await supabaseAdmin
            .from("games")
            .insert({
                slug: newSlug,
                board_size: boardSize,
                game_state: gameState,
            })
            .select()
            .single();

        if (forkError) {
            return {
                status: 500,
                body: {
                    error: forkError.message,
                },
            };
        }

        return {
            status: 409,
            body: {
                error: "Game was updated elsewhere",
                newSlug: forkedGame.slug,
            },
        };
    }

    const { data, error } = await supabaseAdmin
        .from("games")
        .update({
            board_size: boardSize,
            game_state: gameState,
            updated_at: new Date().toISOString(),
        })
        .eq("slug", slug)
        .select()
        .single();

    if (error) {
        return {
            status: 500,
            body: {
                error: error.message,
            },
        };
    }

    return {
        status: 200,
        body: data,
    };
}