import type { BoardSize, GameState, Move, Stone } from "../components/types";
import { validateMoveEdits } from "./gameEdits";
import type { StoneOwner } from "./gameReplay";

export type Vertex = {
    x: number;
    y: number;
};

export type CorrectionTapAction = "select" | "deselect" | "play";

export type CorrectionPreviewStone = Vertex & {
    color: Stone;
};

export type StoneSelectionDragState = {
    pointerId: number;
    origin: Vertex;
    offsetX: number;
    offsetY: number;
};

export type BoardGridGeometry = {
    left: number;
    top: number;
    cellSize: number;
    boardSize: BoardSize;
};

export type ApplyRecorderCorrectionResult =
    | {
        ok: true;
        gameState: GameState;
        selectedMoveIndexes: number[];
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

    return "select";
}

export function shouldStartStoneSelectionHold({
    editableMoveIndexAtVertex,
    selectedMoveIndexes,
}: {
    editableMoveIndexAtVertex: number | null;
    selectedMoveIndexes: number[];
}) {
    return selectedMoveIndexes.length === 0 && editableMoveIndexAtVertex !== null;
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

export function isStoneSelectionDragActive({
    hasTouchPreview,
    selectedMoveIndexes,
    didStartStoneSelectionDrag,
}: {
    hasTouchPreview: boolean;
    selectedMoveIndexes: number[];
    didStartStoneSelectionDrag: boolean;
}) {
    return (
        hasTouchPreview &&
        selectedMoveIndexes.length > 0 &&
        didStartStoneSelectionDrag
    );
}

export function shouldShowStoneSelectionCloseButton({
    hasSelectedStone,
    isDraggingSelectedStones,
}: {
    hasSelectedStone: boolean;
    isDraggingSelectedStones: boolean;
}) {
    return hasSelectedStone && !isDraggingSelectedStones;
}

export function shouldShowCorrectionTouchGuide({
    hasTouchPreview,
    isMovingSelectedStones,
    hasValidDragPreview,
}: {
    hasTouchPreview: boolean;
    isMovingSelectedStones: boolean;
    hasValidDragPreview: boolean;
}) {
    return hasTouchPreview && (!isMovingSelectedStones || hasValidDragPreview);
}

export function shouldShowOriginalSelectedStones({
    isMovingSelectedStones,
    hasValidDragPreview,
}: {
    isMovingSelectedStones: boolean;
    hasValidDragPreview: boolean;
}) {
    return !isMovingSelectedStones || !hasValidDragPreview;
}

export function toggleCorrectionSelection({
    moveIndex,
    selectedMoveIndexes,
}: {
    moveIndex: number;
    selectedMoveIndexes: number[];
}) {
    return selectedMoveIndexes.includes(moveIndex)
        ? selectedMoveIndexes.filter((selectedMoveIndex) => selectedMoveIndex !== moveIndex)
        : [...selectedMoveIndexes, moveIndex];
}

export function visitCorrectionSelectionDragMove({
    moveIndex,
    selectedMoveIndexes,
    visitedMoveIndexes,
}: {
    moveIndex: number | null;
    selectedMoveIndexes: number[];
    visitedMoveIndexes: Set<number>;
}) {
    if (moveIndex === null || visitedMoveIndexes.has(moveIndex)) {
        return {
            selectedMoveIndexes,
            visitedMoveIndexes,
            didToggle: false,
        };
    }

    const nextVisitedMoveIndexes = new Set(visitedMoveIndexes);
    nextVisitedMoveIndexes.add(moveIndex);

    return {
        selectedMoveIndexes: toggleCorrectionSelection({
            moveIndex,
            selectedMoveIndexes,
        }),
        visitedMoveIndexes: nextVisitedMoveIndexes,
        didToggle: true,
    };
}

export function getVertexFromBoardPointer({
    clientX,
    clientY,
    grid,
}: {
    clientX: number;
    clientY: number;
    grid: BoardGridGeometry;
}): Vertex | null {
    const localX = clientX - grid.left;
    const localY = clientY - grid.top;

    const x = Math.round(localX / grid.cellSize - 0.5);
    const y = Math.round(localY / grid.cellSize - 0.5);

    if (x < 0 || x >= grid.boardSize || y < 0 || y >= grid.boardSize) {
        return null;
    }

    return { x, y };
}

export function createStoneSelectionDragState({
    grid,
    origin,
    pointerId,
    pointerX,
    pointerY,
}: {
    grid: BoardGridGeometry;
    origin: Vertex;
    pointerId: number;
    pointerX: number;
    pointerY: number;
}): StoneSelectionDragState {
    const stoneCenterX = grid.left + origin.x * grid.cellSize + grid.cellSize / 2;
    const stoneCenterY = grid.top + origin.y * grid.cellSize + grid.cellSize / 2;

    return {
        pointerId,
        origin,
        offsetX: pointerX - stoneCenterX,
        offsetY: pointerY - stoneCenterY,
    };
}

export function getStoneSelectionDragVertexFromPointer({
    clientX,
    clientY,
    dragState,
    grid,
}: {
    clientX: number;
    clientY: number;
    dragState: StoneSelectionDragState;
    grid: BoardGridGeometry;
}): Vertex | null {
    return getVertexFromBoardPointer({
        clientX: clientX - dragState.offsetX,
        clientY: clientY - dragState.offsetY,
        grid,
    });
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
    const anchorMoveIndex = selectedMoveIndexes[0];

    return getMoveVertex({
        gameState,
        moveIndex: anchorMoveIndex,
    });
}

export function getStoneCorrectionOrigin({
    from,
    gameState,
    selectedMoveIndexes,
}: {
    from?: Vertex | null;
    gameState: GameState;
    selectedMoveIndexes: number[];
}): Vertex | null {
    if (selectedMoveIndexes.length === 1) {
        return getDefaultCorrectionOrigin({
            gameState,
            selectedMoveIndexes,
        });
    }

    return from ?? getDefaultCorrectionOrigin({ gameState, selectedMoveIndexes });
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

    const origin = getStoneCorrectionOrigin({
        from,
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

    const origin = getStoneCorrectionOrigin({
        from,
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
        selectedMoveIndexes,
        status: null,
        hasUnsavedChanges: true,
    };
}
