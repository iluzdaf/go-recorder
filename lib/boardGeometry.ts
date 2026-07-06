import type { BoardGridGeometry } from "./gameCorrectionUi";
import type { PositionViewGridGeometry } from "./positionView";

export const MIN_VERTEX_SIZE_PX = 16;
export const BOARD_EDGE_GUTTER_PX = 2;
export const COORDINATE_LABEL_GUTTER_VERTICES = 2;

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
    // Visible extent for a partial (position-view) board; defaults to the full
    // board. Width fits the columns and height fits the rows independently, so
    // a non-square visible region (e.g. 10x16 or 8x5) fills the screen instead
    // of shrinking to a square of its larger side.
    columns?: number;
    rows?: number;
    showCoordinates?: boolean;
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
    columns = boardSize,
    rows = boardSize,
    showCoordinates = true,
    width,
    height,
}: GetBoardVertexSizeOptions) {
    const gutter = showCoordinates ? COORDINATE_LABEL_GUTTER_VERTICES : 0;
    const horizontal =
        Math.max(0, width - BOARD_EDGE_GUTTER_PX * 2) / (columns + gutter);
    const vertical =
        Math.max(0, height - BOARD_EDGE_GUTTER_PX * 2) / (rows + gutter);

    return Math.max(MIN_VERTEX_SIZE_PX, Math.min(horizontal, vertical));
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
