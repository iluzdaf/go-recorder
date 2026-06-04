export type MagnifierAnchor = "left" | "right";

export function getMagnifierAnchor({
    boardX,
    boardY,
    boardSize,
}: {
    boardX: number;
    boardY: number;
    boardSize: number;
}): MagnifierAnchor {
    if (boardY < boardSize / 2 && boardX >= boardSize / 2) {
        return "left";
    }

    return "right";
}
