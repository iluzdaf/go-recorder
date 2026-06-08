import type { BoardSize, FinalPosition, GameState } from "../components/types";
import { replayGame } from "./gameReplay";

export function isValidFinalPosition(
    value: unknown,
    boardSize: BoardSize
): value is FinalPosition {
    return (
        Array.isArray(value) &&
        value.length === boardSize &&
        value.every(
            (row) =>
                Array.isArray(row) &&
                row.length === boardSize &&
                row.every((sign) => sign === -1 || sign === 0 || sign === 1)
        )
    );
}

export function getFinalPositionFromGameState({
    boardSize,
    gameState,
}: {
    boardSize: BoardSize;
    gameState: GameState;
}):
    | {
        ok: true;
        finalPosition: FinalPosition;
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
            error: replay.error ?? "Invalid share input",
        };
    }

    return {
        ok: true,
        finalPosition: replay.board.signMap,
    };
}
