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
        selectedMoveIndex: null;
        status: null;
        hasUnsavedChanges: true;
    }
    | {
        ok: false;
        error: string;
    };

export function getSelectedMoveVertex({
    gameState,
    selectedMoveIndex,
}: {
    gameState: GameState;
    selectedMoveIndex: number | null;
}): Vertex | null {
    if (selectedMoveIndex === null) return null;

    const selectedMove = gameState.moves[selectedMoveIndex];

    if (selectedMove?.type !== "play") return null;

    return {
        x: selectedMove.x,
        y: selectedMove.y,
    };
}

export function getPreviewStone({
    currentPlayer,
    gameState,
    selectedMoveIndex,
}: {
    currentPlayer: Stone;
    gameState: GameState;
    selectedMoveIndex: number | null;
}) {
    if (selectedMoveIndex === null) return currentPlayer;

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
    selectedMoveIndex,
}: {
    editableMoveIndexAtVertex: number | null;
    selectedMoveIndex: number | null;
}): CorrectionTapAction {
    if (selectedMoveIndex === null) return "play";

    if (editableMoveIndexAtVertex === selectedMoveIndex) {
        return "deselect";
    }

    return "correct";
}

export function shouldStartStoneSelectionHold({
    editableMoveIndexAtVertex,
    selectedMoveIndex,
}: {
    editableMoveIndexAtVertex: number | null;
    selectedMoveIndex: number | null;
}) {
    return selectedMoveIndex === null && editableMoveIndexAtVertex !== null;
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

export function applyRecorderCorrection({
    boardSize,
    gameState,
    selectedMoveIndex,
    vertex,
}: {
    boardSize: BoardSize;
    gameState: GameState;
    selectedMoveIndex: number | null;
    vertex: Vertex;
}): ApplyRecorderCorrectionResult {
    if (selectedMoveIndex === null) {
        return {
            ok: false,
            error: "No stone is selected",
        };
    }

    const result = validateMoveEdits({
        boardSize,
        originalGameState: gameState,
        edits: [
            {
                moveIndex: selectedMoveIndex,
                to: vertex,
            },
        ],
    });

    if (!result.ok) return result;

    return {
        ok: true,
        gameState: result.gameState,
        selectedMoveIndex: null,
        status: null,
        hasUnsavedChanges: true,
    };
}
