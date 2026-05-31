import type { ShareRecord } from "../components/types";

type ShareRow = {
    slug: string;
    source_kind: "game" | "draft";
    board_size: ShareRecord["boardSize"];
    game_state: ShareRecord["gameState"];
    black_player_name: string | null;
    white_player_name: string | null;
    handicap: number;
    created_at: string;
};

export function mapShareRowToShareRecord(row: ShareRow): ShareRecord {
    return {
        slug: row.slug,
        sourceKind: row.source_kind,
        boardSize: row.board_size,
        gameState: row.game_state,
        blackPlayerName: row.black_player_name ?? null,
        whitePlayerName: row.white_player_name ?? null,
        handicap: row.handicap,
        createdAt: row.created_at,
    };
}
