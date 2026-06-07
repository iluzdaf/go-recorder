import type { ShareRecord } from "../components/types";

type ShareRow = {
    slug: string;
    source_kind: "game" | "draft";
    draft_kind?: ShareRecord["draftKind"];
    board_size: ShareRecord["boardSize"];
    game_state: ShareRecord["gameState"];
    black_player_name: string | null;
    white_player_name: string | null;
    handicap: number;
    parent_share_slug?: string | null;
    base_move_count?: number | null;
    created_at: string;
};

export function mapShareRowToShareRecord(row: ShareRow): ShareRecord {
    return {
        slug: row.slug,
        sourceKind: row.source_kind,
        draftKind: row.draft_kind ?? null,
        boardSize: row.board_size,
        gameState: row.game_state,
        blackPlayerName: row.black_player_name ?? null,
        whitePlayerName: row.white_player_name ?? null,
        handicap: row.handicap,
        parentShareSlug: row.parent_share_slug ?? null,
        baseMoveCount: row.base_move_count ?? null,
        createdAt: row.created_at,
    };
}
