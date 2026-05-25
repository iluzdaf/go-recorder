import type { BoardSize, GameState } from "../components/types";

export function createSlug() {
    return crypto.randomUUID().slice(0, 8);
}

export function isValidBoardSize(value: unknown) {
    return value === 9 || value === 13 || value === 19;
}

export function isValidGameState(value: unknown): value is GameState {
    return (
        typeof value === "object" &&
        value !== null &&
        "moves" in value &&
        Array.isArray(value.moves) &&
        "currentPlayer" in value &&
        (value.currentPlayer === "B" || value.currentPlayer === "W")
    );
}

export function createGameSnapshot(size: BoardSize, gameState: GameState) {
    return JSON.stringify({
        size,
        gameState,
    });
}

export function shouldAutosave({
    hasLoadedGame,
    updatedAt,
    hasUnsavedChanges,
    currentSnapshot,
    lastSavedSnapshot,
}: {
    hasLoadedGame: boolean;
    updatedAt: string | null;
    hasUnsavedChanges: boolean;
    currentSnapshot: string;
    lastSavedSnapshot: string;
}) {
    return (
        hasLoadedGame &&
        updatedAt !== null &&
        hasUnsavedChanges &&
        currentSnapshot !== lastSavedSnapshot
    );
}

export function shouldContinueAutosaveQueue({
    needsSaveAfterCurrentSave,
    latestSnapshot,
    lastSavedSnapshot,
}: {
    needsSaveAfterCurrentSave: boolean;
    latestSnapshot: string;
    lastSavedSnapshot: string;
}) {
    return needsSaveAfterCurrentSave && latestSnapshot !== lastSavedSnapshot;
}
