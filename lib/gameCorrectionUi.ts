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

export type StoneCorrectionHandlePosition = {
    left: number;
    top: number;
    transform: "translateX(-50%)" | "translate(-50%, -50%)";
};

type StoneCorrectionHandleGrid = Pick<
    BoardGridGeometry,
    "left" | "top" | "cellSize"
>;

export type BoardAreaZoomWindow = {
    startX: number;
    startY: number;
    size: number;
};

type BoardAreaZoomConfig = {
    starts: number[];
    windowSize: number;
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

export function getStoneCorrectionHandleAnchor(vertices: Vertex[]): Vertex | null {
    if (vertices.length === 0) return null;

    let minX = vertices[0]?.x ?? 0;
    let maxX = minX;
    let minY = vertices[0]?.y ?? 0;
    let maxY = minY;

    for (const vertex of vertices) {
        minX = Math.min(minX, vertex.x);
        maxX = Math.max(maxX, vertex.x);
        minY = Math.min(minY, vertex.y);
        maxY = Math.max(maxY, vertex.y);
    }

    return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
    };
}

export function getStoneCorrectionHandlePosition({
    anchor,
    gapPx,
    grid,
    isSingleStoneSelection,
}: {
    anchor: Vertex | null;
    gapPx: number;
    grid: StoneCorrectionHandleGrid;
    isSingleStoneSelection: boolean;
}): StoneCorrectionHandlePosition | null {
    if (!anchor) return null;

    const left = grid.left + anchor.x * grid.cellSize + grid.cellSize / 2;

    if (isSingleStoneSelection) {
        return {
            left,
            top: grid.top + (anchor.y + 1) * grid.cellSize + gapPx,
            transform: "translateX(-50%)",
        };
    }

    return {
        left,
        top: grid.top + anchor.y * grid.cellSize + grid.cellSize / 2,
        transform: "translate(-50%, -50%)",
    };
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
    isDeselectingLastStone,
}: {
    hasTouchPreview: boolean;
    isMovingSelectedStones: boolean;
    hasValidDragPreview: boolean;
    isDeselectingLastStone: boolean;
}) {
    return (
        hasTouchPreview &&
        !isDeselectingLastStone &&
        (!isMovingSelectedStones || hasValidDragPreview)
    );
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

export function shouldShowPlacementPreview({
    hasTouchPreview,
    hasSelectedStone,
    isCorrectionDragActive,
}: {
    hasTouchPreview: boolean;
    hasSelectedStone: boolean;
    isCorrectionDragActive: boolean;
}) {
    return hasTouchPreview && !hasSelectedStone && !isCorrectionDragActive;
}

const PLACEMENT_ZOOM_CONFIG: Partial<Record<BoardSize, BoardAreaZoomConfig>> = {
    9: {
        starts: [0, 3],
        windowSize: 6,
    },
    13: {
        starts: [0, 4],
        windowSize: 9,
    },
    19: {
        starts: [0, 6],
        windowSize: 13,
    },
};
const PLACEMENT_ZOOM_MAX_CELL_SIZE_PX = 24;

function getPlacementZoomWindowStart({
    boardSize,
    coordinate,
    starts,
}: {
    boardSize: BoardSize;
    coordinate: number;
    starts: number[];
}) {
    const segmentIndex = Math.min(
        starts.length - 1,
        Math.floor((coordinate * starts.length) / boardSize)
    );

    return starts[segmentIndex] ?? 0;
}

export function getPlacementZoomWindow({
    boardSize,
    vertex,
}: {
    boardSize: BoardSize;
    vertex: Vertex;
}): BoardAreaZoomWindow | null {
    const config = PLACEMENT_ZOOM_CONFIG[boardSize];
    if (!config) return null;

    return {
        startX: getPlacementZoomWindowStart({
            boardSize,
            coordinate: vertex.x,
            starts: config.starts,
        }),
        startY: getPlacementZoomWindowStart({
            boardSize,
            coordinate: vertex.y,
            starts: config.starts,
        }),
        size: config.windowSize,
    };
}

export function shouldUsePlacementZoom({
    cellSize,
}: {
    cellSize: number;
}) {
    return cellSize < PLACEMENT_ZOOM_MAX_CELL_SIZE_PX;
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

export function getVertexFromPlacementZoomPointer({
    clientX,
    clientY,
    grid,
    zoomWindow,
}: {
    clientX: number;
    clientY: number;
    grid: BoardGridGeometry;
    zoomWindow: BoardAreaZoomWindow;
}): Vertex | null {
    const zoomCellSize = (grid.cellSize * grid.boardSize) / zoomWindow.size;
    const localX = clientX - grid.left;
    const localY = clientY - grid.top;
    const windowX = Math.round(localX / zoomCellSize - 0.5);
    const windowY = Math.round(localY / zoomCellSize - 0.5);

    if (
        windowX < 0 ||
        windowX >= zoomWindow.size ||
        windowY < 0 ||
        windowY >= zoomWindow.size
    ) {
        return null;
    }

    return {
        x: zoomWindow.startX + windowX,
        y: zoomWindow.startY + windowY,
    };
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

export function isRecorderCorrectionLegal({
    boardSize,
    from,
    gameState,
    selectedMoveIndexes,
    vertex,
}: {
    boardSize: BoardSize;
    from: Vertex;
    gameState: GameState;
    selectedMoveIndexes: number[];
    vertex: Vertex;
}) {
    return validateMoveEdits({
        boardSize,
        originalGameState: gameState,
        edits: createMoveEdits({
            from,
            gameState,
            selectedMoveIndexes,
            to: vertex,
        }),
    }).ok;
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
