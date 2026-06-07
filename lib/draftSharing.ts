import type { LocalDraftRecord } from "../components/types";

export function canShareDraft(draft: LocalDraftRecord) {
    if (draft.draftKind === "variation") {
        return (
            draft.baseMoveCount !== null &&
            draft.gameState.moves.length > draft.baseMoveCount
        );
    }

    return true;
}
