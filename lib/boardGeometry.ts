export const BOARD_PADDING_PX = 16;
export const MIN_VERTEX_SIZE_PX = 16;
export const COORDINATE_GUTTER_VERTICES = 1;

export type BoardGridMetrics = {
    left: number;
    top: number;
    cellSize: number;
    boardSizePx: number;
};

type GetBoardVertexSizeOptions = {
    boardSize: number;
    width: number;
    height: number;
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
