import type { BoardSize, GameState } from "../components/types";
import { getHandicapSetupStones } from "./gameLogic";

type CreateLocalGameInput = {
    boardSize: BoardSize;
    gameState: GameState;
    blackPlayerName: string | null;
    whitePlayerName: string | null;
    handicap: number;
};

type CreateLocalGameInputFromFormInput = {
    boardSize: BoardSize;
    blackPlayerName: string;
    whitePlayerName: string;
    handicap: number;
};

type CreateLocalDraftInput = CreateLocalGameInput & {
    draftKind: "board";
};

export function getOptionalPlayerName(value: string) {
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
}

export function createInitialGameState(
    boardSize: BoardSize,
    handicap: number
): GameState {
    return {
        setupStones: getHandicapSetupStones(boardSize, handicap),
        moves: [],
        currentPlayer: handicap > 0 ? "W" : "B",
    };
}

export function createLocalGameInputFromForm({
    boardSize,
    blackPlayerName,
    whitePlayerName,
    handicap,
}: CreateLocalGameInputFromFormInput): CreateLocalGameInput {
    return {
        boardSize,
        gameState: createInitialGameState(boardSize, handicap),
        blackPlayerName: getOptionalPlayerName(blackPlayerName),
        whitePlayerName: getOptionalPlayerName(whitePlayerName),
        handicap,
    };
}

export function createLocalBoardDraftInputFromForm({
    boardSize,
    blackPlayerName,
    whitePlayerName,
    handicap,
}: CreateLocalGameInputFromFormInput): CreateLocalDraftInput {
    return {
        draftKind: "board",
        boardSize,
        gameState: createInitialGameState(boardSize, handicap),
        blackPlayerName: getOptionalPlayerName(blackPlayerName),
        whitePlayerName: getOptionalPlayerName(whitePlayerName),
        handicap,
    };
}

export function createDefaultLocalBoardDraftInput(): CreateLocalDraftInput {
    return {
        draftKind: "board",
        boardSize: 19,
        gameState: createInitialGameState(19, 0),
        blackPlayerName: null,
        whitePlayerName: null,
        handicap: 0,
    };
}
