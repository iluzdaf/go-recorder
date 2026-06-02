import type { BoardSize, GameState, Move, Stone } from "../components/types";
import { validateMoveEdits } from "./gameEdits";
import type { StoneOwner } from "./gameReplay";

export type Vertex = {
    x: number;
    y: number;
};

export type CorrectionTapAction = "correct" | "deselect" | "play";

export type CorrectionPreviewStone = Vertex & {
    color: Stone;
};

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
}: {
    editableMoveIndexAtVertex: number | null;
    selectedMoveIndexes: number[];
}) {
    return editableMoveIndexAtVertex !== null;
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
    from,
    gameState,
    selectedMoveIndexes,
    to,
}: {
    from: Vertex;
    gameState: GameState;
    selectedMoveIndexes: number[];
    to: Vertex;
}) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    return selectedMoveIndexes.map((moveIndex) => {
        const move = gameState.moves[moveIndex];

        if (move?.type !== "play") {
            return {
                moveIndex,
                to,
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

function getMoveVertex({
    gameState,
    moveIndex,
}: {
    gameState: GameState;
    moveIndex: number | undefined;
}): Vertex | null {
    const move = moveIndex === undefined ? null : gameState.moves[moveIndex];

    if (move?.type !== "play") return null;

    return {
        x: move.x,
        y: move.y,
    };
}

function getDefaultCorrectionOrigin({
    gameState,
    selectedMoveIndexes,
}: {
    gameState: GameState;
    selectedMoveIndexes: number[];
}): Vertex | null {
    const anchorMoveIndex = selectedMoveIndexes.at(-1);

    return getMoveVertex({
        gameState,
        moveIndex: anchorMoveIndex,
    });
}

export function getCorrectionPreviewStones({
    currentPlayer,
    from,
    gameState,
    selectedMoveIndexes,
    vertex,
}: {
    currentPlayer: Stone;
    from?: Vertex | null;
    gameState: GameState;
    selectedMoveIndexes: number[];
    vertex: Vertex;
}): CorrectionPreviewStone[] {
    if (selectedMoveIndexes.length === 0) {
        return [
            {
                ...vertex,
                color: currentPlayer,
            },
        ];
    }

    const origin =
        selectedMoveIndexes.length === 1
            ? getDefaultCorrectionOrigin({
                  gameState,
                  selectedMoveIndexes,
              })
            : from ??
              getDefaultCorrectionOrigin({
                  gameState,
                  selectedMoveIndexes,
              });

    if (!origin) return [];

    const dx = vertex.x - origin.x;
    const dy = vertex.y - origin.y;

    return selectedMoveIndexes.flatMap((moveIndex) => {
        const move = gameState.moves[moveIndex];

        if (move?.type !== "play") return [];

        return {
            x: move.x + dx,
            y: move.y + dy,
            color: move.color,
        };
    });
}

export function applyRecorderCorrection({
    boardSize,
    from,
    gameState,
    selectedMoveIndexes,
    vertex,
}: {
    boardSize: BoardSize;
    from?: Vertex;
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

    const origin =
        selectedMoveIndexes.length === 1
            ? getDefaultCorrectionOrigin({
                  gameState,
                  selectedMoveIndexes,
              })
            : from ??
              getDefaultCorrectionOrigin({
                  gameState,
                  selectedMoveIndexes,
              });

    if (!origin) {
        return {
            ok: false,
            error: "No stone is selected",
        };
    }

    const result = validateMoveEdits({
        boardSize,
        originalGameState: gameState,
        edits: createMoveEdits({
            from: origin,
            gameState,
            selectedMoveIndexes,
            to: vertex,
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
