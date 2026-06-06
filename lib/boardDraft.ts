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

export function clearDraftShareCache(
    draft: LocalDraftRecord
): LocalDraftRecord {
    return {
        ...draft,
        lastShareSlug: null,
    };
}
