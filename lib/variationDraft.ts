import type { BoardSize, GameState, Move } from "../components/types";
import { playGameMove, replayGame } from "./gameReplay";

export type MoveNumberMarker = {
    type: "label";
    label: string;
};

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
