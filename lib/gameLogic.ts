import type { BoardSize, GameState, SetupStone } from "../components/types";
import { createRandomId } from "./randomId";

export function createSlug() {
    return createRandomId().slice(0, 8);
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

const HANDICAP_SETUP_STONES: Record<BoardSize, Record<number, SetupStone[]>> = {
    9: {
        2: [
            { x: 2, y: 6, color: "B" },
            { x: 6, y: 2, color: "B" },
        ],
        3: [
            { x: 2, y: 6, color: "B" },
            { x: 6, y: 2, color: "B" },
            { x: 6, y: 6, color: "B" },
        ],
        4: [
            { x: 2, y: 6, color: "B" },
            { x: 6, y: 2, color: "B" },
            { x: 2, y: 2, color: "B" },
            { x: 6, y: 6, color: "B" },
        ],
        5: [
            { x: 2, y: 6, color: "B" },
            { x: 6, y: 2, color: "B" },
            { x: 2, y: 2, color: "B" },
            { x: 6, y: 6, color: "B" },
            { x: 4, y: 4, color: "B" },
        ],
        6: [
            { x: 2, y: 6, color: "B" },
            { x: 6, y: 2, color: "B" },
            { x: 2, y: 2, color: "B" },
            { x: 6, y: 6, color: "B" },
            { x: 2, y: 4, color: "B" },
            { x: 6, y: 4, color: "B" },
        ],
        7: [
            { x: 2, y: 6, color: "B" },
            { x: 6, y: 2, color: "B" },
            { x: 2, y: 2, color: "B" },
            { x: 6, y: 6, color: "B" },
            { x: 2, y: 4, color: "B" },
            { x: 6, y: 4, color: "B" },
            { x: 4, y: 4, color: "B" },
        ],
        8: [
            { x: 2, y: 6, color: "B" },
            { x: 6, y: 2, color: "B" },
            { x: 2, y: 2, color: "B" },
            { x: 6, y: 6, color: "B" },
            { x: 2, y: 4, color: "B" },
            { x: 6, y: 4, color: "B" },
            { x: 4, y: 2, color: "B" },
            { x: 4, y: 6, color: "B" },
        ],
        9: [
            { x: 2, y: 6, color: "B" },
            { x: 6, y: 2, color: "B" },
            { x: 2, y: 2, color: "B" },
            { x: 6, y: 6, color: "B" },
            { x: 2, y: 4, color: "B" },
            { x: 6, y: 4, color: "B" },
            { x: 4, y: 2, color: "B" },
            { x: 4, y: 6, color: "B" },
            { x: 4, y: 4, color: "B" },
        ],
    },
    13: {
        2: [
            { x: 3, y: 9, color: "B" },
            { x: 9, y: 3, color: "B" },
        ],
        3: [
            { x: 3, y: 9, color: "B" },
            { x: 9, y: 3, color: "B" },
            { x: 9, y: 9, color: "B" },
        ],
        4: [
            { x: 3, y: 9, color: "B" },
            { x: 9, y: 3, color: "B" },
            { x: 3, y: 3, color: "B" },
            { x: 9, y: 9, color: "B" },
        ],
        5: [
            { x: 3, y: 9, color: "B" },
            { x: 9, y: 3, color: "B" },
            { x: 3, y: 3, color: "B" },
            { x: 9, y: 9, color: "B" },
            { x: 6, y: 6, color: "B" },
        ],
        6: [
            { x: 3, y: 9, color: "B" },
            { x: 9, y: 3, color: "B" },
            { x: 3, y: 3, color: "B" },
            { x: 9, y: 9, color: "B" },
            { x: 3, y: 6, color: "B" },
            { x: 9, y: 6, color: "B" },
        ],
        7: [
            { x: 3, y: 9, color: "B" },
            { x: 9, y: 3, color: "B" },
            { x: 3, y: 3, color: "B" },
            { x: 9, y: 9, color: "B" },
            { x: 3, y: 6, color: "B" },
            { x: 9, y: 6, color: "B" },
            { x: 6, y: 6, color: "B" },
        ],
        8: [
            { x: 3, y: 9, color: "B" },
            { x: 9, y: 3, color: "B" },
            { x: 3, y: 3, color: "B" },
            { x: 9, y: 9, color: "B" },
            { x: 3, y: 6, color: "B" },
            { x: 9, y: 6, color: "B" },
            { x: 6, y: 3, color: "B" },
            { x: 6, y: 9, color: "B" },
        ],
        9: [
            { x: 3, y: 9, color: "B" },
            { x: 9, y: 3, color: "B" },
            { x: 3, y: 3, color: "B" },
            { x: 9, y: 9, color: "B" },
            { x: 3, y: 6, color: "B" },
            { x: 9, y: 6, color: "B" },
            { x: 6, y: 3, color: "B" },
            { x: 6, y: 9, color: "B" },
            { x: 6, y: 6, color: "B" },
        ],
    },
    19: {
        2: [
            { x: 3, y: 15, color: "B" },
            { x: 15, y: 3, color: "B" },
        ],
        3: [
            { x: 3, y: 15, color: "B" },
            { x: 15, y: 3, color: "B" },
            { x: 15, y: 15, color: "B" },
        ],
        4: [
            { x: 3, y: 15, color: "B" },
            { x: 15, y: 3, color: "B" },
            { x: 3, y: 3, color: "B" },
            { x: 15, y: 15, color: "B" },
        ],
        5: [
            { x: 3, y: 15, color: "B" },
            { x: 15, y: 3, color: "B" },
            { x: 3, y: 3, color: "B" },
            { x: 15, y: 15, color: "B" },
            { x: 9, y: 9, color: "B" },
        ],
        6: [
            { x: 3, y: 15, color: "B" },
            { x: 15, y: 3, color: "B" },
            { x: 3, y: 3, color: "B" },
            { x: 15, y: 15, color: "B" },
            { x: 3, y: 9, color: "B" },
            { x: 15, y: 9, color: "B" },
        ],
        7: [
            { x: 3, y: 15, color: "B" },
            { x: 15, y: 3, color: "B" },
            { x: 3, y: 3, color: "B" },
            { x: 15, y: 15, color: "B" },
            { x: 3, y: 9, color: "B" },
            { x: 15, y: 9, color: "B" },
            { x: 9, y: 9, color: "B" },
        ],
        8: [
            { x: 3, y: 15, color: "B" },
            { x: 15, y: 3, color: "B" },
            { x: 3, y: 3, color: "B" },
            { x: 15, y: 15, color: "B" },
            { x: 3, y: 9, color: "B" },
            { x: 15, y: 9, color: "B" },
            { x: 9, y: 3, color: "B" },
            { x: 9, y: 15, color: "B" },
        ],
        9: [
            { x: 3, y: 15, color: "B" },
            { x: 15, y: 3, color: "B" },
            { x: 3, y: 3, color: "B" },
            { x: 15, y: 15, color: "B" },
            { x: 3, y: 9, color: "B" },
            { x: 15, y: 9, color: "B" },
            { x: 9, y: 3, color: "B" },
            { x: 9, y: 15, color: "B" },
            { x: 9, y: 9, color: "B" },
        ],
    },
};

export function getHandicapSetupStones(
    boardSize: BoardSize,
    handicap: number
): SetupStone[] {
    return HANDICAP_SETUP_STONES[boardSize][handicap] ?? [];
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
