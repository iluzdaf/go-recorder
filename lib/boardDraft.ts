import type {
    GameState,
    LocalDraftRecord,
    SetupStone,
    Stone,
} from "../components/types";

export type BoardDraftVertex = {
    x: number;
    y: number;
};

export type BoardDraftStrokeMode = "draw" | "erase";

export function getSetupStoneAtVertex(
    setupStones: SetupStone[],
    vertex: BoardDraftVertex
) {
    return setupStones.findIndex(
        (setupStone) => setupStone.x === vertex.x && setupStone.y === vertex.y
    );
}

export function toggleBoardDraftStone({
    gameState,
    selectedColor,
    vertex,
}: {
    gameState: GameState;
    selectedColor: Stone;
    vertex: BoardDraftVertex;
}): GameState {
    const existingStoneIndex = getSetupStoneAtVertex(
        gameState.setupStones,
        vertex
    );

    if (existingStoneIndex !== -1) {
        return {
            ...gameState,
            moves: [],
            setupStones: gameState.setupStones.filter(
                (_, index) => index !== existingStoneIndex
            ),
        };
    }

    return {
        ...gameState,
        moves: [],
        setupStones: [
            ...gameState.setupStones,
            {
                ...vertex,
                color: selectedColor,
            },
        ],
    };
}

export function getBoardDraftStrokeMode({
    gameState,
    vertex,
}: {
    gameState: GameState;
    vertex: BoardDraftVertex;
}): BoardDraftStrokeMode {
    return getSetupStoneAtVertex(gameState.setupStones, vertex) === -1
        ? "draw"
        : "erase";
}

export function applyBoardDraftStrokeVertex({
    gameState,
    mode,
    selectedColor,
    vertex,
}: {
    gameState: GameState;
    mode: BoardDraftStrokeMode;
    selectedColor: Stone;
    vertex: BoardDraftVertex;
}): GameState {
    const existingStoneIndex = getSetupStoneAtVertex(
        gameState.setupStones,
        vertex
    );

    if (mode === "erase") {
        if (existingStoneIndex === -1) {
            return gameState.moves.length === 0
                ? gameState
                : {
                      ...gameState,
                      moves: [],
                  };
        }

        return {
            ...gameState,
            moves: [],
            setupStones: gameState.setupStones.filter(
                (_, index) => index !== existingStoneIndex
            ),
        };
    }

    if (existingStoneIndex !== -1) {
        return gameState.moves.length === 0
            ? gameState
            : {
                  ...gameState,
                  moves: [],
              };
    }

    return {
        ...gameState,
        moves: [],
        setupStones: [
            ...gameState.setupStones,
            {
                ...vertex,
                color: selectedColor,
            },
        ],
    };
}

export function clearDraftShareCache(
    draft: LocalDraftRecord
): LocalDraftRecord {
    return {
        ...draft,
        lastShareSlug: null,
    };
}
