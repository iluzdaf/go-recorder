import type { BoardSize, GameState, LocalGameRecord } from "../components/types";
import { createGameSnapshot } from "./gameLogic";

export type LoadedLocalGame = {
    size: BoardSize;
    gameState: GameState;
    updatedAt: string;
    metadata: {
        blackPlayerName: string | null;
        whitePlayerName: string | null;
        handicap: number;
    };
    snapshot: string;
};

export function createLoadedLocalGame(record: LocalGameRecord): LoadedLocalGame {
    const gameState = {
        ...record.gameState,
        setupStones: record.gameState.setupStones ?? [],
    };

    return {
        size: record.boardSize,
        gameState,
        updatedAt: record.updatedAt,
        metadata: {
            blackPlayerName: record.blackPlayerName,
            whitePlayerName: record.whitePlayerName,
            handicap: record.handicap,
        },
        snapshot: createGameSnapshot(record.boardSize, gameState),
    };
}
