import { describe, expect, it } from "vitest";

import type { LocalDraftRecord } from "../components/types";
import { canShareDraft } from "../lib/draftSharing";

const baseDraft: LocalDraftRecord = {
    recordKind: "draft",
    draftKind: "board",
    id: "draft-1",
    boardSize: 19,
    gameState: {
        setupStones: [],
        moves: [],
        currentPlayer: "B",
    },
    blackPlayerName: null,
    whitePlayerName: null,
    handicap: 0,
    createdAt: "2026-06-07T00:00:00.000Z",
    updatedAt: "2026-06-07T00:00:00.000Z",
    lastShareSlug: null,
    parentShareSlug: null,
    baseMoveCount: null,
};

describe("canShareDraft", () => {
    it("blocks board drafts with no setup stones", () => {
        expect(canShareDraft(baseDraft)).toBe(false);
    });

    it("allows board drafts with setup stones", () => {
        expect(
            canShareDraft({
                ...baseDraft,
                gameState: {
                    setupStones: [{ x: 3, y: 3, color: "B" }],
                    moves: [],
                    currentPlayer: "B",
                },
            })
        ).toBe(true);
    });

    it("allows variation drafts with new moves after the shared base", () => {
        expect(
            canShareDraft({
                ...baseDraft,
                draftKind: "variation",
                gameState: {
                    setupStones: [],
                    moves: [
                        { type: "play", x: 3, y: 3, color: "B" },
                        { type: "play", x: 4, y: 4, color: "W" },
                    ],
                    currentPlayer: "B",
                },
                parentShareSlug: "share123",
                baseMoveCount: 1,
            })
        ).toBe(true);
    });

    it("blocks variation drafts with no moves after the shared base", () => {
        expect(
            canShareDraft({
                ...baseDraft,
                draftKind: "variation",
                gameState: {
                    setupStones: [],
                    moves: [{ type: "play", x: 3, y: 3, color: "B" }],
                    currentPlayer: "W",
                },
                parentShareSlug: "share123",
                baseMoveCount: 1,
            })
        ).toBe(false);
    });
});
