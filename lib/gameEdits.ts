import type { BoardSize, GameState } from "../components/types";
import { replayGame } from "./gameReplay";

export type MoveEdit = {
    moveIndex: number;
    to: {
        x: number;
        y: number;
    };
};

export type CreateEditedGameStateResult =
    | {
        ok: true;
        gameState: GameState;
    }
    | {
        ok: false;
        error: string;
    };

export type ValidateMoveEditsResult =
    | {
        ok: true;
        gameState: GameState;
    }
    | {
        ok: false;
        error: string;
    };

function isCoordinateInBounds({
    boardSize,
    x,
    y,
}: {
    boardSize: BoardSize;
    x: number;
    y: number;
}) {
    return (
        Number.isInteger(x) &&
        Number.isInteger(y) &&
        x >= 0 &&
        x < boardSize &&
        y >= 0 &&
        y < boardSize
    );
}

export function createEditedGameState({
    boardSize,
    gameState,
    edits,
}: {
    boardSize: BoardSize;
    gameState: GameState;
    edits: MoveEdit[];
}): CreateEditedGameStateResult {
    if (edits.length === 0) {
        return {
            ok: true,
            gameState,
        };
    }

    const editedMoveIndexes = new Set<number>();

    for (const edit of edits) {
        if (!Number.isInteger(edit.moveIndex)) {
            return {
                ok: false,
                error: "Edit move index must be an integer",
            };
        }

        if (edit.moveIndex < 0 || edit.moveIndex >= gameState.moves.length) {
            return {
                ok: false,
                error: "Edit move index is out of range",
            };
        }

        if (editedMoveIndexes.has(edit.moveIndex)) {
            return {
                ok: false,
                error: "Edit move indexes must be unique",
            };
        }

        const move = gameState.moves[edit.moveIndex];

        if (move.type !== "play") {
            return {
                ok: false,
                error: "Only play moves can be edited",
            };
        }

        if (
            !isCoordinateInBounds({
                boardSize,
                x: edit.to.x,
                y: edit.to.y,
            })
        ) {
            return {
                ok: false,
                error: "Edit destination is out of bounds",
            };
        }

        editedMoveIndexes.add(edit.moveIndex);
    }

    const editsByMoveIndex = new Map(
        edits.map((edit) => [edit.moveIndex, edit] as const)
    );

    return {
        ok: true,
        gameState: {
            ...gameState,
            moves: gameState.moves.map((move, moveIndex) => {
                const edit = editsByMoveIndex.get(moveIndex);

                if (!edit || move.type !== "play") return move;

                return {
                    ...move,
                    x: edit.to.x,
                    y: edit.to.y,
                };
            }),
        },
    };
}

function getEarliestEditedMoveIndex(edits: MoveEdit[]) {
    return Math.min(...edits.map((edit) => edit.moveIndex));
}

function areCapturedMoveIndexesEqual(left: number[], right: number[]) {
    if (left.length !== right.length) return false;

    return left.every((value, index) => value === right[index]);
}

export function validateMoveEdits({
    boardSize,
    originalGameState,
    edits,
}: {
    boardSize: BoardSize;
    originalGameState: GameState;
    edits: MoveEdit[];
}): ValidateMoveEditsResult {
    const editedGameStateResult = createEditedGameState({
        boardSize,
        gameState: originalGameState,
        edits,
    });

    if (!editedGameStateResult.ok) {
        return editedGameStateResult;
    }

    if (edits.length === 0) {
        return {
            ok: true,
            gameState: originalGameState,
        };
    }

    const originalReplay = replayGame({
        boardSize,
        setupStones: originalGameState.setupStones,
        moves: originalGameState.moves,
    });

    if (!originalReplay.legal) {
        return {
            ok: false,
            error: originalReplay.error ?? "Original game cannot be replayed",
        };
    }

    const editedReplay = replayGame({
        boardSize,
        setupStones: editedGameStateResult.gameState.setupStones,
        moves: editedGameStateResult.gameState.moves,
    });

    if (!editedReplay.legal) {
        return {
            ok: false,
            error: editedReplay.error ?? "Edited game cannot be replayed",
        };
    }

    const earliestEditedMoveIndex = getEarliestEditedMoveIndex(edits);

    if (editedReplay.moveRecords.length !== originalReplay.moveRecords.length) {
        return {
            ok: false,
            error: "Edited game replay changed move history",
        };
    }

    for (
        let moveIndex = earliestEditedMoveIndex;
        moveIndex < originalReplay.moveRecords.length;
        moveIndex += 1
    ) {
        const originalRecord = originalReplay.moveRecords[moveIndex];
        const editedRecord = editedReplay.moveRecords[moveIndex];

        if (!originalRecord || !editedRecord) {
            return {
                ok: false,
                error: "Edited game replay changed move history",
            };
        }

        if (
            !areCapturedMoveIndexesEqual(
                originalRecord.capturedMoveIndexes,
                editedRecord.capturedMoveIndexes
            )
        ) {
            return {
                ok: false,
                error: "Edit changes future captures",
            };
        }
    }

    if (editedGameStateResult.gameState.currentPlayer !== originalGameState.currentPlayer) {
        return {
            ok: false,
            error: "Edit changes current player",
        };
    }

    return {
        ok: true,
        gameState: editedGameStateResult.gameState,
    };
}
