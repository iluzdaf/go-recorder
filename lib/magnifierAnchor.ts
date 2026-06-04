export type MagnifierAnchor = "left" | "right";

export function getMagnifierAnchor({
    startColumn,
    currentColumn,
    boardSize,
    leftPlacementOverlapsBoard,
}: {
    startColumn: number | null;
    currentColumn: number;
    boardSize: number;
    leftPlacementOverlapsBoard: boolean;
}): MagnifierAnchor {
    if (!leftPlacementOverlapsBoard) {
        return "left";
    }

    const leftThreshold = Math.ceil(boardSize * 0.42);
    const rightThreshold = Math.floor(boardSize * 0.58);

    if (currentColumn < leftThreshold) {
        return "right";
    }

    if (currentColumn > rightThreshold) {
        return "left";
    }

    if (startColumn !== null && startColumn < leftThreshold) {
        return "right";
    }

    return "left";
}
