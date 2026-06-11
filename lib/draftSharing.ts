import GoBoard from "@sabaki/go-board";

import type { LocalDraftRecord } from "../components/types";

export function getIllegalBoardGroupVertices(
    draft: LocalDraftRecord
): [number, number][] {
    if (draft.draftKind !== "board") return [];

    const {
        boardSize,
        gameState: { setupStones },
    } = draft;
    const signMap: (0 | 1 | -1)[][] = Array.from({ length: boardSize }, () =>
        Array.from({ length: boardSize }, () => 0 as 0)
    );
    for (const s of setupStones) {
        signMap[s.y][s.x] = s.color === "B" ? 1 : -1;
    }

    const board = new GoBoard(signMap);
    const seen = new Set<string>();
    const result: [number, number][] = [];

    for (const { x, y } of setupStones) {
        const key = `${x},${y}`;
        if (seen.has(key)) continue;
        if (!board.hasLiberties([x, y])) {
            for (const [cx, cy] of board.getChain([x, y])) {
                seen.add(`${cx},${cy}`);
                result.push([cx, cy]);
            }
        }
    }

    return result;
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
