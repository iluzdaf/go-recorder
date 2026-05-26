export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { BoardSize, GameState } from "@/components/types";
import { createSlug, getHandicapSetupStones, isValidBoardSize } from "@/lib/gameLogic";

type CreateGameRequestBody = {
    boardSize?: unknown;
    blackPlayerName?: unknown;
    whitePlayerName?: unknown;
    handicap?: unknown;
};

function getOptionalPlayerName(value: unknown) {
    if (typeof value !== "string") return null;

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
}

function getHandicap(value: unknown) {
    if (typeof value !== "number") return 0;
    if (!Number.isInteger(value)) return 0;
    if (value < 0) return 0;

    return value;
}

export async function POST(request: Request) {
    const slug = createSlug();
    const body = (await request.json().catch(() => ({}))) as CreateGameRequestBody;

    const boardSizeValue = body.boardSize ?? 19;

    if (!isValidBoardSize(boardSizeValue)) {
        return NextResponse.json(
            { error: "Invalid board size" },
            { status: 400 }
        );
    }

    const boardSize: BoardSize = boardSizeValue;
    const blackPlayerName = getOptionalPlayerName(body.blackPlayerName);
    const whitePlayerName = getOptionalPlayerName(body.whitePlayerName);
    const handicap = getHandicap(body.handicap);

    const gameState: GameState = {
        setupStones: getHandicapSetupStones(boardSize, handicap),
        moves: [],
        currentPlayer: handicap > 0 ? "W" : "B",
    };

    const { data, error } = await supabaseAdmin
        .from("games")
        .insert({
            slug,
            board_size: boardSize,
            game_state: gameState,
            black_player_name: blackPlayerName,
            white_player_name: whitePlayerName,
            handicap,
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