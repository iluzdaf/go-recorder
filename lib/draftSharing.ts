import type { LocalDraftRecord } from "../components/types";
import { getNoLibertyVertices } from "./boardLiberties";

export function getIllegalBoardGroupVertices(
    draft: LocalDraftRecord
): [number, number][] {
    if (draft.draftKind !== "board") return [];

    return getNoLibertyVertices({
        boardSize: draft.boardSize,
        setupStones: draft.gameState.setupStones,
    });
}

export function canShareDraft(draft: LocalDraftRecord) {
    if (draft.draftKind === "variation") {
        return (
            draft.baseMoveCount !== null &&
            draft.gameState.moves.length > draft.baseMoveCount
        );
    }

    return draft.gameState.setupStones.length > 0;
}
