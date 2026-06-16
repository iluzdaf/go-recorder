import type { BoardSize, GameState, SetupStone } from "../components/types";
import type { CreateLocalDraftInput } from "./localGames";
import type { DetectionResult } from "./boardDetection";
import { sanitizePositionView } from "./positionView";

function isInRangeStone(stone: SetupStone, boardSize: BoardSize) {
    return (
        stone.x >= 0 &&
        stone.x < boardSize &&
        stone.y >= 0 &&
        stone.y < boardSize
    );
}

function dedupeSetupStones(stones: SetupStone[]): SetupStone[] {
    const byVertex = new Map<string, SetupStone>();
    for (const stone of stones) {
        byVertex.set(`${stone.x},${stone.y}`, stone);
    }
    return [...byVertex.values()];
}

export function createBoardDraftInputFromDetection(
    detection: DetectionResult
): CreateLocalDraftInput {
    const boardSize = detection.boardSize;
    const setupStones = dedupeSetupStones(
        detection.setupStones.filter((stone) => isInRangeStone(stone, boardSize))
    );

    const gameState: GameState = {
        setupStones,
        moves: [],
        currentPlayer: "B",
    };

    return {
        draftKind: "board",
        boardSize,
        gameState,
        blackPlayerName: null,
        whitePlayerName: null,
        handicap: 0,
        positionView: sanitizePositionView(detection.positionView, boardSize),
    };
}
