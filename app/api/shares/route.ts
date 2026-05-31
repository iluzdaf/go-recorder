export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { createSlug } from "../../../lib/gameLogic";
import { validateCreateShareInput } from "../../../lib/shareValidation";

export async function POST(request: Request) {
    const body: unknown = await request.json().catch(() => null);

    if (!validateCreateShareInput(body)) {
        return NextResponse.json(
            { error: "Invalid share input" },
            { status: 400 }
        );
    }

    const slug = createSlug();

    const { data, error } = await supabaseAdmin
        .from("shares")
        .insert({
            slug,
            source_kind: body.sourceKind,
            board_size: body.boardSize,
            game_state: body.gameState,
            black_player_name: body.blackPlayerName,
            white_player_name: body.whitePlayerName,
            handicap: body.handicap,
        })
        .select("slug")
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
