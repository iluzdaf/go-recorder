import type {
    BoardSize,
    GameState,
    LocalDraftRecord,
    SetupStone,
    Stone,
} from "../components/types";
import { hasNoLibertyGroups } from "./boardLiberties";

export type BoardDraftVertex = {
    x: number;
    y: number;
};

export type BoardDraftStrokeMode = "draw" | "erase";

export type MoveSetupStoneResult =
    | {
          ok: true;
          gameState: GameState;
      }
    | {
          ok: false;
          error: string;
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

function isVertexInBounds(vertex: BoardDraftVertex, boardSize: BoardSize) {
    return (
        Number.isInteger(vertex.x) &&
        Number.isInteger(vertex.y) &&
        vertex.x >= 0 &&
        vertex.x < boardSize &&
        vertex.y >= 0 &&
        vertex.y < boardSize
    );
}

export function moveSetupStone({
    boardSize,
    from,
    gameState,
    to,
}: {
    boardSize: BoardSize;
    from: BoardDraftVertex;
    gameState: GameState;
    to: BoardDraftVertex;
}): MoveSetupStoneResult {
    const fromIndex = getSetupStoneAtVertex(gameState.setupStones, from);
    if (fromIndex === -1) {
        return { ok: false, error: "No stone is selected" };
    }

    if (from.x === to.x && from.y === to.y) {
        return { ok: true, gameState };
    }

    if (!isVertexInBounds(to, boardSize)) {
        return { ok: false, error: "Destination is out of bounds" };
    }

    if (getSetupStoneAtVertex(gameState.setupStones, to) !== -1) {
        return { ok: false, error: "Destination is occupied" };
    }

    const movedStone: SetupStone = {
        ...gameState.setupStones[fromIndex],
        x: to.x,
        y: to.y,
    };
    const nextSetupStones = gameState.setupStones.map((stone, index) =>
        index === fromIndex ? movedStone : stone
    );

    if (hasNoLibertyGroups({ boardSize, setupStones: nextSetupStones })) {
        return {
            ok: false,
            error: "Move leaves a group with no liberties",
        };
    }

    return {
        ok: true,
        gameState: {
            ...gameState,
            moves: [],
            setupStones: nextSetupStones,
        },
    };
}

export function removeSetupStone({
    gameState,
    vertex,
}: {
    gameState: GameState;
    vertex: BoardDraftVertex;
}): GameState {
    const existingStoneIndex = getSetupStoneAtVertex(
        gameState.setupStones,
        vertex
    );

    if (existingStoneIndex === -1) return gameState;

    return {
        ...gameState,
        moves: [],
        setupStones: gameState.setupStones.filter(
            (_, index) => index !== existingStoneIndex
        ),
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
