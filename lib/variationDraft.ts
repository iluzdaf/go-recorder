import type { BoardSize, GameState, Move } from "../components/types";
import { playGameMove, replayGame } from "./gameReplay";

const GO_COLUMN_LABELS = "ABCDEFGHJKLMNOPQRSTUVWXYZ";

export type MoveNumberMarker = {
    type: "label";
    label: string;
};

export type CapturedVariationMoveCaptionEntry = {
    color: Move["color"];
    coordinate: string;
    label: string;
    moveIndex: number;
    moveNumber: number;
    x: number;
    y: number;
};

export function getGoCoordinate({
    boardSize,
    x,
    y,
}: {
    boardSize: BoardSize;
    x: number;
    y: number;
}) {
    return `${GO_COLUMN_LABELS[x] ?? String(x + 1)}${boardSize - y}`;
}

export function playVariationDraftMove({
    boardSize,
    gameState,
    vertex,
}: {
    boardSize: BoardSize;
    gameState: GameState;
    vertex: { x: number; y: number };
}):
    | {
        ok: true;
        gameState: GameState;
    }
    | {
        ok: false;
        error: string;
    } {
    const replay = replayGame({
        boardSize,
        setupStones: gameState.setupStones,
        moves: gameState.moves,
    });

    if (!replay.legal) {
        return {
            ok: false,
            error: replay.error ?? "Invalid base position",
        };
    }

    const result = playGameMove({
        board: replay.board,
        gameState,
        x: vertex.x,
        y: vertex.y,
    });

    if (!result.ok) return result;

    return {
        ok: true,
        gameState: result.gameState,
    };
}

export function undoVariationDraftMove({
    baseMoveCount,
    gameState,
}: {
    baseMoveCount: number;
    gameState: GameState;
}): GameState {
    if (gameState.moves.length <= baseMoveCount) {
        return gameState;
    }

    const lastMove = gameState.moves.at(-1);
    if (!lastMove) return gameState;

    return {
        ...gameState,
        moves: gameState.moves.slice(0, -1),
        currentPlayer: lastMove.color,
    };
}

export function createVariationMoveNumberMarkerMap({
    boardSize,
    moves,
    signMap,
    startMoveIndex = 0,
}: {
    boardSize: BoardSize;
    moves: Move[];
    signMap: number[][];
    startMoveIndex?: number;
}) {
    const markerMap: (MoveNumberMarker | null)[][] = Array.from(
        { length: boardSize },
        () => Array.from({ length: boardSize }, () => null)
    );

    for (
        let moveIndex = startMoveIndex;
        moveIndex < moves.length;
        moveIndex += 1
    ) {
        const move = moves[moveIndex];
        if (move.type !== "play") continue;
        if (signMap[move.y]?.[move.x] === 0) continue;

        markerMap[move.y][move.x] = {
            type: "label",
            label: String(moveIndex + 1),
        };
    }

    return markerMap;
}

export function getCapturedVariationMoveCaptionEntries({
    baseMoveCount,
    boardSize,
    gameState,
}: {
    baseMoveCount: number;
    boardSize: BoardSize;
    gameState: GameState;
}): CapturedVariationMoveCaptionEntry[] {
    const replay = replayGame({
        boardSize,
        setupStones: gameState.setupStones,
        moves: gameState.moves,
    });

    if (!replay.legal) return [];

    return gameState.moves.flatMap((move, moveIndex) => {
        if (moveIndex < baseMoveCount || move.type !== "play") return [];

        const owner = replay.visibleStoneOwners[move.y]?.[move.x] ?? null;
        if (owner?.type === "move" && owner.moveIndex === moveIndex) return [];

        const moveNumber = moveIndex + 1;
        const coordinate = getGoCoordinate({
            boardSize,
            x: move.x,
            y: move.y,
        });

        return [
            {
                color: move.color,
                coordinate,
                label: `${moveNumber} at ${coordinate}`,
                moveIndex,
                moveNumber,
                x: move.x,
                y: move.y,
            },
        ];
    });
}
