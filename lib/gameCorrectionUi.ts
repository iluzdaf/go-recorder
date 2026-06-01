import type { BoardSize, GameState, Move, Stone } from "../components/types";
import { validateMoveEdits } from "./gameEdits";
import type { StoneOwner } from "./gameReplay";

export type Vertex = {
    x: number;
    y: number;
};

export type CorrectionTapAction = "correct" | "deselect" | "play";

export type ApplyRecorderCorrectionResult =
    | {
        ok: true;
        gameState: GameState;
        selectedMoveIndexes: [];
        status: null;
        hasUnsavedChanges: true;
    }
    | {
        ok: false;
        error: string;
    };

export function getSelectedMoveVertices({
    gameState,
    selectedMoveIndexes,
}: {
    gameState: GameState;
    selectedMoveIndexes: number[];
}): Vertex[] {
    return selectedMoveIndexes.flatMap((selectedMoveIndex) => {
        const selectedMove = gameState.moves[selectedMoveIndex];

        if (selectedMove?.type !== "play") return [];

        return {
            x: selectedMove.x,
            y: selectedMove.y,
        };
    });
}

export function getPreviewStone({
    currentPlayer,
    gameState,
    selectedMoveIndexes,
}: {
    currentPlayer: Stone;
    gameState: GameState;
    selectedMoveIndexes: number[];
}) {
    const selectedMoveIndex = selectedMoveIndexes[0];
    if (selectedMoveIndex === undefined) return currentPlayer;

    const selectedMove = gameState.moves[selectedMoveIndex];

    if (selectedMove?.type !== "play") return currentPlayer;

    return selectedMove.color;
}

export function getEditableMoveIndexAtVertex({
    moves,
    vertex,
    visibleStoneOwners,
}: {
    moves: Move[];
    vertex: Vertex;
    visibleStoneOwners: (StoneOwner | null)[][];
}): number | null {
    const owner = visibleStoneOwners[vertex.y]?.[vertex.x];
    if (owner?.type !== "move") return null;

    const move = moves[owner.moveIndex];
    if (move?.type !== "play") return null;

    return owner.moveIndex;
}

export function getCorrectionTapAction({
    editableMoveIndexAtVertex,
    selectedMoveIndexes,
}: {
    editableMoveIndexAtVertex: number | null;
    selectedMoveIndexes: number[];
}): CorrectionTapAction {
    if (selectedMoveIndexes.length === 0) return "play";

    if (
        editableMoveIndexAtVertex !== null &&
        selectedMoveIndexes.includes(editableMoveIndexAtVertex)
    ) {
        return "deselect";
    }

    return "correct";
}

export function shouldStartStoneSelectionHold({
    editableMoveIndexAtVertex,
    selectedMoveIndexes,
}: {
    editableMoveIndexAtVertex: number | null;
    selectedMoveIndexes: number[];
}) {
    return (
        editableMoveIndexAtVertex !== null &&
        !selectedMoveIndexes.includes(editableMoveIndexAtVertex)
    );
}

export function didPointerLeaveHoldVertex({
    origin,
    vertex,
}: {
    origin: Vertex | null;
    vertex: Vertex | null;
}) {
    return (
        origin !== null &&
        (vertex === null || vertex.x !== origin.x || vertex.y !== origin.y)
    );
}

export function shouldApplyHoldDragCorrection({
    origin,
    vertex,
}: {
    origin: Vertex | null;
    vertex: Vertex | null;
}) {
    return (
        origin !== null &&
        vertex !== null &&
        (vertex.x !== origin.x || vertex.y !== origin.y)
    );
}

export function createMoveEdits({
    gameState,
    selectedMoveIndexes,
    vertex,
}: {
    gameState: GameState;
    selectedMoveIndexes: number[];
    vertex: Vertex;
}) {
    const anchorMoveIndex = selectedMoveIndexes[0];
    const anchorMove =
        anchorMoveIndex === undefined ? null : gameState.moves[anchorMoveIndex];

    if (anchorMove?.type !== "play") return [];

    const dx = vertex.x - anchorMove.x;
    const dy = vertex.y - anchorMove.y;

    return selectedMoveIndexes.map((moveIndex) => {
        const move = gameState.moves[moveIndex];

        if (move?.type !== "play") {
            return {
                moveIndex,
                to: vertex,
            };
        }

        return {
            moveIndex,
            to: {
                x: move.x + dx,
                y: move.y + dy,
            },
        };
    });
}

export function applyRecorderCorrection({
    boardSize,
    gameState,
    selectedMoveIndexes,
    vertex,
}: {
    boardSize: BoardSize;
    gameState: GameState;
    selectedMoveIndexes: number[];
    vertex: Vertex;
}): ApplyRecorderCorrectionResult {
    if (selectedMoveIndexes.length === 0) {
        return {
            ok: false,
            error: "No stone is selected",
        };
    }

    const result = validateMoveEdits({
        boardSize,
        originalGameState: gameState,
        edits: createMoveEdits({
            gameState,
            selectedMoveIndexes,
            vertex,
        }),
    });

    if (!result.ok) return result;

    return {
        ok: true,
        gameState: result.gameState,
        selectedMoveIndexes: [],
        status: null,
        hasUnsavedChanges: true,
    };
}
