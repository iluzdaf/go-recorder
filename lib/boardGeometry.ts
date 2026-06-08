import type { BoardGridGeometry } from "./gameCorrectionUi";
import type { PositionViewGridGeometry } from "./positionView";

export const BOARD_PADDING_PX = 16;
export const MIN_VERTEX_SIZE_PX = 16;
export const COORDINATE_GUTTER_VERTICES = 1;

export type BoardGridMetrics = {
    left: number;
    top: number;
    cellSize: number;
    boardSizePx: number;
};

export type LiveBoardGridMetrics = {
    gridGeometry: BoardGridGeometry;
    gridMetrics: BoardGridMetrics;
};

type GetBoardVertexSizeOptions = {
    boardSize: number;
    width: number;
    height: number;
};

type GetLiveBoardGridMetricsOptions = {
    boardSize: BoardGridGeometry["boardSize"];
    gobanWrapper: Element;
};

type GetLivePositionViewGridMetricsOptions = {
    columns: number;
    gobanWrapper: Element;
    rows: number;
    startX: number;
    startY: number;
};

export function getBoardVertexSize({
    boardSize,
    width,
    height,
}: GetBoardVertexSizeOptions) {
    const availableSize = Math.max(0, Math.min(width, height) - BOARD_PADDING_PX);

    return Math.max(
        MIN_VERTEX_SIZE_PX,
        Math.floor(availableSize / (boardSize + COORDINATE_GUTTER_VERTICES))
    );
}

export function createDefaultBoardGridMetrics(
    boardSize: number,
    vertexSize = 24
): BoardGridMetrics {
    return {
        left: 0,
        top: 0,
        cellSize: vertexSize,
        boardSizePx: vertexSize * boardSize,
    };
}

function isShudanGridElement(element: Element | null): element is Element {
    if (!element) return false;

    if (typeof SVGElement === "undefined") {
        return typeof element.getBoundingClientRect === "function";
    }

    return element instanceof SVGElement;
}

export function getLiveBoardGridMetrics({
    boardSize,
    gobanWrapper,
}: GetLiveBoardGridMetricsOptions): LiveBoardGridMetrics | null {
    const grid = gobanWrapper.querySelector(".shudan-grid");
    if (!isShudanGridElement(grid)) return null;

    const wrapperRect = gobanWrapper.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const gridMetrics = {
        left: gridRect.left - wrapperRect.left,
        top: gridRect.top - wrapperRect.top,
        cellSize: gridRect.width / boardSize,
        boardSizePx: gridRect.width,
    };

    return {
        gridGeometry: {
            left: gridRect.left,
            top: gridRect.top,
            cellSize: gridMetrics.cellSize,
            boardSize,
        },
        gridMetrics,
    };
}

export function getLivePositionViewGridMetrics({
    columns,
    gobanWrapper,
    rows,
    startX,
    startY,
}: GetLivePositionViewGridMetricsOptions): PositionViewGridGeometry | null {
    const grid = gobanWrapper.querySelector(".shudan-grid");
    if (!isShudanGridElement(grid)) return null;

    const gridRect = grid.getBoundingClientRect();

    return {
        left: gridRect.left,
        top: gridRect.top,
        cellSize: gridRect.width / columns,
        rows,
        columns,
        startX,
        startY,
    };
}
