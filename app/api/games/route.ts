export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { BoardSize, GameState } from "@/components/types";
import { createSlug } from "@/lib/gameLogic";

export async function POST() {
    const slug = createSlug();
    const boardSize: BoardSize = 19;

    const gameState: GameState = {
        moves: [],
        currentPlayer: "B",
    };

    const { data, error } = await supabaseAdmin
        .from("games")
        .insert({
            slug,
            board_size: boardSize,
            game_state: gameState,
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json({
        slug: data.slug,
    });
}