import type {
    BoardSize,
    PositionView,
    PositionViewAnchor,
} from "../components/types";

export const POSITION_VIEW_ANCHORS: PositionViewAnchor[] = [
    "full",
    "top-left",
    "top",
    "top-right",
    "left",
    "center",
    "right",
    "bottom-left",
    "bottom",
    "bottom-right",
];

export type PositionViewRange = {
    rangeX: [number, number];
    rangeY: [number, number];
    rows: number;
    columns: number;
    startX: number;
    startY: number;
};

export type PositionViewGridGeometry = {
    left: number;
    top: number;
    cellSize: number;
    rows: number;
    columns: number;
    startX: number;
    startY: number;
};

function isPositionViewAnchor(value: unknown): value is PositionViewAnchor {
    return (
        typeof value === "string" &&
        POSITION_VIEW_ANCHORS.includes(value as PositionViewAnchor)
    );
}

function isValidDimension(value: unknown, boardSize: BoardSize) {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 2 &&
        value <= boardSize
    );
}

export function isValidPositionView(
    value: unknown,
    boardSize: BoardSize
): value is PositionView {
    if (typeof value !== "object" || value === null) return false;

    const positionView = value as Partial<PositionView>;

    return (
        isPositionViewAnchor(positionView.anchor) &&
        isValidDimension(positionView.rows, boardSize) &&
        isValidDimension(positionView.columns, boardSize)
    );
}

export function sanitizePositionView(
    value: unknown,
    boardSize: BoardSize
): PositionView | null {
    return isValidPositionView(value, boardSize) ? value : null;
}

export function getDefaultPositionView(boardSize: BoardSize): PositionView {
    return {
        anchor: "full",
        rows: boardSize,
        columns: boardSize,
    };
}

export function clampPositionView(
    positionView: PositionView,
    boardSize: BoardSize
): PositionView {
    return {
        anchor: positionView.anchor,
        rows: Math.min(boardSize, Math.max(2, Math.round(positionView.rows))),
        columns: Math.min(
            boardSize,
            Math.max(2, Math.round(positionView.columns))
        ),
    };
}

function getRangeStart({
    anchor,
    boardSize,
    visibleSize,
}: {
    anchor: "start" | "center" | "end";
    boardSize: BoardSize;
    visibleSize: number;
}) {
    if (anchor === "start") return 0;
    if (anchor === "end") return boardSize - visibleSize;

    return Math.floor((boardSize - visibleSize) / 2);
}

function getHorizontalAnchor(anchor: PositionViewAnchor) {
    if (anchor.endsWith("left") || anchor === "left") return "start";
    if (anchor.endsWith("right") || anchor === "right") return "end";

    return "center";
}

function getVerticalAnchor(anchor: PositionViewAnchor) {
    if (anchor.startsWith("top") || anchor === "top") return "start";
    if (anchor.startsWith("bottom") || anchor === "bottom") return "end";

    return "center";
}

export function getPositionViewRange({
    boardSize,
    positionView,
}: {
    boardSize: BoardSize;
    positionView?: PositionView | null;
}): PositionViewRange | null {
    if (!positionView || positionView.anchor === "full") return null;

    const clampedView = clampPositionView(positionView, boardSize);
    const startX = getRangeStart({
        anchor: getHorizontalAnchor(clampedView.anchor),
        boardSize,
        visibleSize: clampedView.columns,
    });
    const startY = getRangeStart({
        anchor: getVerticalAnchor(clampedView.anchor),
        boardSize,
        visibleSize: clampedView.rows,
    });

    return {
        rangeX: [startX, startX + clampedView.columns - 1],
        rangeY: [startY, startY + clampedView.rows - 1],
        rows: clampedView.rows,
        columns: clampedView.columns,
        startX,
        startY,
    };
}

export function getPositionViewDisplaySize({
    boardSize,
    positionView,
}: {
    boardSize: BoardSize;
    positionView?: PositionView | null;
}) {
    const range = getPositionViewRange({
        boardSize,
        positionView,
    });

    return range ? Math.max(range.rows, range.columns) : boardSize;
}

export function getVertexFromPositionViewPointer({
    clientX,
    clientY,
    grid,
}: {
    clientX: number;
    clientY: number;
    grid: PositionViewGridGeometry;
}) {
    const localX = clientX - grid.left;
    const localY = clientY - grid.top;
    const x = Math.round(localX / grid.cellSize - 0.5);
    const y = Math.round(localY / grid.cellSize - 0.5);

    if (x < 0 || x >= grid.columns || y < 0 || y >= grid.rows) {
        return null;
    }

    return {
        x: grid.startX + x,
        y: grid.startY + y,
    };
}
