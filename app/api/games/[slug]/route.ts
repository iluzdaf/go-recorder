import { NextResponse } from "next/server";
import { saveGame } from "@/lib/games";
import { isValidBoardSize, isValidGameState } from "@/lib/gameLogic";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        slug: string;
    }>;
};

export async function GET(
    request: Request,
    context: RouteContext
) {
    const { slug } = await context.params;

    const { data, error } = await supabaseAdmin
        .from("games")
        .select("*")
        .eq("slug", slug)
        .single();

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 404 }
        );
    }

    return NextResponse.json(data);
}

export async function PATCH(
    request: Request,
    context: RouteContext
) {
    const { slug } = await context.params;
    const body = await request.json();

    const { boardSize, gameState, updatedAt } = body;

    if (!isValidBoardSize(boardSize)) {
        return NextResponse.json(
            { error: "Invalid board size" },
            { status: 400 }
        );
    }

    if (!isValidGameState(gameState)) {
        return NextResponse.json(
            { error: "Invalid game state" },
            { status: 400 }
        );
    }

    const result = await saveGame({
        slug,
        boardSize,
        gameState,
        updatedAt,
    });

    return NextResponse.json(result.body, {
        status: result.status,
    });
}