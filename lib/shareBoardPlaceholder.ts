import {
    BOARD_EDGE_GUTTER_PX,
    COORDINATE_LABEL_GUTTER_VERTICES,
    MIN_VERTEX_SIZE_PX,
} from "./boardGeometry";

// Reproduces getBoardVertexSize's fit math in pure CSS so the loading
// placeholder reserves the exact footprint the measured board will occupy.
// The share board area fills the viewport (the header is a fixed overlay), so
// 100vw/100dvh are accurate stand-ins for the measured board-area size and no
// client measurement is needed before first paint.
export function getShareBoardPlaceholderSize({
    columns,
    rows,
    showCoordinates,
}: {
    columns: number;
    rows: number;
    showCoordinates: boolean;
}): { width: string; height: string } {
    const gutter = showCoordinates ? COORDINATE_LABEL_GUTTER_VERTICES : 0;
    const totalColumns = columns + gutter;
    const totalRows = rows + gutter;
    const edge = BOARD_EDGE_GUTTER_PX * 2;
    const vertexSize = `max(${MIN_VERTEX_SIZE_PX}px, min((100vw - ${edge}px) / ${totalColumns}, (100dvh - ${edge}px) / ${totalRows}))`;

    return {
        width: `calc(${vertexSize} * ${totalColumns})`,
        height: `calc(${vertexSize} * ${totalRows})`,
    };
}
