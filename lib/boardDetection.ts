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

export type CornerEstimate = {
    corners: BoardCorner[] | null;
};

function isBoardCorner(value: unknown): value is BoardCorner {
    if (typeof value !== "object" || value === null) return false;
    const corner = value as Partial<BoardCorner>;
    return (
        typeof corner.x === "number" &&
        Number.isFinite(corner.x) &&
        typeof corner.y === "number" &&
        Number.isFinite(corner.y)
    );
}

export function isCornerEstimate(value: unknown): value is CornerEstimate {
    if (typeof value !== "object" || value === null) return false;
    const estimate = value as Partial<CornerEstimate>;
    return (
        estimate.corners === null ||
        (Array.isArray(estimate.corners) &&
            estimate.corners.length === 4 &&
            estimate.corners.every(isBoardCorner))
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
