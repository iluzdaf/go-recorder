import type {
    BoardSize,
    PositionView,
    SetupStone,
    Stone,
} from "../components/types";
import { isValidBoardSize } from "./gameLogic";

export type BoardCorner = {
    x: number;
    y: number;
};

export type DetectionResult = {
    boardSize: BoardSize;
    setupStones: SetupStone[];
    positionView: PositionView | null;
    confidence: number;
};

function isStone(value: unknown): value is Stone {
    return value === "B" || value === "W";
}

function isSetupStone(value: unknown): value is SetupStone {
    if (typeof value !== "object" || value === null) return false;

    const stone = value as Partial<SetupStone>;
    return (
        typeof stone.x === "number" &&
        Number.isInteger(stone.x) &&
        typeof stone.y === "number" &&
        Number.isInteger(stone.y) &&
        isStone(stone.color)
    );
}

export function isDetectionResult(value: unknown): value is DetectionResult {
    if (typeof value !== "object" || value === null) return false;

    const result = value as Partial<DetectionResult>;

    return (
        isValidBoardSize(result.boardSize) &&
        Array.isArray(result.setupStones) &&
        result.setupStones.every(isSetupStone) &&
        (result.positionView === null ||
            (typeof result.positionView === "object" &&
                result.positionView !== null)) &&
        typeof result.confidence === "number"
    );
}
