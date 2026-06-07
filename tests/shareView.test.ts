import { describe, expect, it } from "vitest";

import { mapShareRowToShareRecord } from "../lib/shareView";

const baseShareRow = {
    slug: "share123",
    source_kind: "game" as const,
    board_size: 19 as const,
    game_state: {
        setupStones: [],
        moves: [{ type: "play" as const, x: 3, y: 3, color: "B" as const }],
        currentPlayer: "W" as const,
    },
    black_player_name: "Black",
    white_player_name: null,
    handicap: 0,
    created_at: "2026-06-07T00:00:00.000Z",
};

describe("mapShareRowToShareRecord", () => {
    it("defaults missing draft metadata for existing shares", () => {
        expect(mapShareRowToShareRecord(baseShareRow)).toEqual({
            slug: "share123",
            sourceKind: "game",
            draftKind: null,
            boardSize: 19,
            gameState: baseShareRow.game_state,
            blackPlayerName: "Black",
            whitePlayerName: null,
            handicap: 0,
            parentShareSlug: null,
            baseMoveCount: null,
            createdAt: "2026-06-07T00:00:00.000Z",
        });
    });

    it("maps variation draft metadata", () => {
        expect(
            mapShareRowToShareRecord({
                ...baseShareRow,
                source_kind: "draft",
                draft_kind: "variation",
                parent_share_slug: "parent123",
                base_move_count: 1,
            })
        ).toMatchObject({
            sourceKind: "draft",
            draftKind: "variation",
            parentShareSlug: "parent123",
            baseMoveCount: 1,
        });
    });
});
