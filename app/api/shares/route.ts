export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { createSlug } from "../../../lib/gameLogic";
import { validateCreateShareInput } from "../../../lib/shareValidation";
import { getFinalPositionFromGameState } from "../../../lib/shareFinalPosition";
import { t } from "../../../lib/i18n";

export async function POST(request: Request) {
    const body: unknown = await request.json().catch(() => null);

    if (!validateCreateShareInput(body)) {
        return NextResponse.json(
            { error: t("invalidShareInput") },
            { status: 400 }
        );
    }

    const finalPositionResult = getFinalPositionFromGameState({
        boardSize: body.boardSize,
        gameState: body.gameState,
    });
    if (!finalPositionResult.ok) {
        return NextResponse.json(
            { error: t("invalidShareInput") },
            { status: 400 }
        );
    }

    const slug = createSlug();

    const { data, error } = await supabaseAdmin
        .from("shares")
        .insert({
            slug,
            source_kind: body.sourceKind,
            draft_kind: body.draftKind ?? null,
            board_size: body.boardSize,
            game_state: body.gameState,
            final_position: finalPositionResult.finalPosition,
            black_player_name: body.blackPlayerName,
            white_player_name: body.whitePlayerName,
            handicap: body.handicap,
            komi: body.komi ?? null,
            parent_share_slug: body.parentShareSlug ?? null,
            base_move_count: body.baseMoveCount ?? null,
            position_view: body.positionView ?? null,
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
