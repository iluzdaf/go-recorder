import type { BoardSize } from "../components/types";

export const MAGNIFIER_MIN_WINDOW_SIZE = 7;
export const MAGNIFIER_MAX_WINDOW_SIZE = 9;
export const MAGNIFIER_VISIBLE_SPAN_PERCENT = 75;
export const MAGNIFIER_INSET_PERCENT = 12.5;
export const MAGNIFIER_SIZE_PX = 160;
export const MAGNIFIER_STONE_SIZE_RATIO = 0.78;

type MagnifierAxisRange = {
    minOffset: number;
    maxOffset: number;
};

type MagnifierWindowBounds = {
    minWindowSize: number;
    maxWindowSize: number;
};

export type MagnifierSquareViewport = {
    x: MagnifierAxisRange;
    y: MagnifierAxisRange;
};

export type MagnifierRenderCell = {
    key: string;
    x: number;
    y: number;
    dx: number;
    dy: number;
    sign: number;
    isOnBoard: boolean;
    isCenter: boolean;
    isStarPoint: boolean;
    left: number;
    top: number;
};

export type MagnifierHorizontalLine = {
    key: string;
    top: number;
    left: number;
    right: number;
};

export type MagnifierVerticalLine = {
    key: string;
    left: number;
    top: number;
    bottom: number;
};

export type MagnifierCoordinateLabel = {
    key: string;
    text: string;
    left: number;
    top: number;
};

export type MagnifierRenderModel = {
    gridLines: {
        horizontalLines: MagnifierHorizontalLine[];
        verticalLines: MagnifierVerticalLine[];
    };
    cells: MagnifierRenderCell[];
    coordinateLabels: MagnifierCoordinateLabel[];
};

export function getStarPoints(boardSize: BoardSize) {
    if (boardSize === 9) return [2, 4, 6];
    if (boardSize === 13) return [3, 6, 9];
    return [3, 9, 15];
}

export function getMagnifierWindowBoundsForBoardSize(
    boardSize: BoardSize
): MagnifierWindowBounds {
    if (boardSize === 9) {
        return {
            minWindowSize: 5,
            maxWindowSize: 7,
        };
    }

    return {
        minWindowSize: MAGNIFIER_MIN_WINDOW_SIZE,
        maxWindowSize: MAGNIFIER_MAX_WINDOW_SIZE,
    };
}

export function isStarPoint(x: number, y: number, boardSize: BoardSize) {
    const starPoints = getStarPoints(boardSize);
    return starPoints.includes(x) && starPoints.includes(y);
}

type MagnifierContextCue = "left-edge" | "right-edge" | "top-edge" | "bottom-edge" | "hoshi" | "stone";

function getMagnifierContextCues({
    boardX,
    boardY,
    boardSize,
    signMap,
    windowSize,
}: {
    boardX: number;
    boardY: number;
    boardSize: BoardSize;
    signMap: number[][];
    windowSize: number;
}) {
    const radius = Math.floor(windowSize / 2);
    const minX = Math.max(0, boardX - radius);
    const maxX = Math.min(boardSize - 1, boardX + radius);
    const minY = Math.max(0, boardY - radius);
    const maxY = Math.min(boardSize - 1, boardY + radius);

    const cues = new Set<MagnifierContextCue>();

    if (minX === 0) cues.add("left-edge");
    if (maxX === boardSize - 1) cues.add("right-edge");
    if (minY === 0) cues.add("top-edge");
    if (maxY === boardSize - 1) cues.add("bottom-edge");

    for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
            if ((signMap[y]?.[x] ?? 0) !== 0) {
                cues.add("stone");
                break;
            }
        }

        if (cues.has("stone")) break;
    }

    for (const starPoint of getStarPoints(boardSize)) {
        if (starPoint < minX || starPoint > maxX) continue;
        if (starPoint < minY || starPoint > maxY) continue;

        cues.add("hoshi");
        break;
    }

    return cues;
}

export function getMagnifierWindowSize({
    boardX,
    boardY,
    boardSize,
    signMap,
    minWindowSize = MAGNIFIER_MIN_WINDOW_SIZE,
    maxWindowSize = MAGNIFIER_MAX_WINDOW_SIZE,
}: {
    boardX: number;
    boardY: number;
    boardSize: BoardSize;
    signMap: number[][];
    minWindowSize?: number;
    maxWindowSize?: number;
}) {
    const boardWindowBounds = getMagnifierWindowBoundsForBoardSize(boardSize);
    const normalizedMinWindowSize = Math.max(
        boardWindowBounds.minWindowSize,
        minWindowSize % 2 === 0 ? minWindowSize + 1 : minWindowSize
    );
    const normalizedMaxWindowSize = Math.min(
        boardWindowBounds.maxWindowSize,
        maxWindowSize % 2 === 0 ? maxWindowSize - 1 : maxWindowSize
    );

    if (normalizedMaxWindowSize < normalizedMinWindowSize) {
        return normalizedMinWindowSize;
    }

    for (
        let windowSize = normalizedMinWindowSize;
        windowSize <= normalizedMaxWindowSize;
        windowSize += 2
    ) {
        const cues = getMagnifierContextCues({
            boardX,
            boardY,
            boardSize,
            signMap,
            windowSize,
        });

        if (cues.size >= 2) {
            return windowSize;
        }
    }

    return normalizedMaxWindowSize;
}

function isMagnifierEdgeVisible({
    boardX,
    boardY,
    boardSize,
    windowSize,
    edge,
}: {
    boardX: number;
    boardY: number;
    boardSize: BoardSize;
    windowSize: number;
    edge: "left" | "right" | "top" | "bottom";
}) {
    const radius = Math.floor(windowSize / 2);

    if (edge === "left") {
        return boardX - radius <= 0;
    }

    if (edge === "right") {
        return boardX + radius >= boardSize - 1;
    }

    if (edge === "top") {
        return boardY - radius <= 0;
    }

    return boardY + radius >= boardSize - 1;
}

function getMagnifierAxisRange(windowSize: number): MagnifierAxisRange {
    const visibleCount = Math.max(
        MAGNIFIER_MIN_WINDOW_SIZE,
        windowSize % 2 === 0 ? windowSize + 1 : windowSize
    );
    const radius = Math.floor(visibleCount / 2);

    return {
        minOffset: -radius,
        maxOffset: radius,
    };
}

function getMagnifierAxisRangeForCoordinate({
    boardCoord,
    boardSize,
    windowSize,
}: {
    boardCoord: number;
    boardSize: BoardSize;
    windowSize: number;
}) {
    const rangeRadius = Math.floor(windowSize / 2);
    const startDistance = boardCoord;
    const endDistance = boardSize - 1 - boardCoord;

    if (startDistance <= rangeRadius && startDistance <= endDistance) {
        return {
            minOffset: -startDistance,
            maxOffset: windowSize - 1 - startDistance,
        };
    }

    if (endDistance <= rangeRadius) {
        return {
            minOffset: -(windowSize - 1) + endDistance,
            maxOffset: endDistance,
        };
    }

    return getMagnifierAxisRange(windowSize);
}

export function getMagnifierSquareViewport({
    boardX,
    boardY,
    boardSize,
    windowSize,
}: {
    boardX: number;
    boardY: number;
    boardSize: BoardSize;
    windowSize: number;
}): MagnifierSquareViewport {
    const normalizedWindowSize = Math.max(
        MAGNIFIER_MIN_WINDOW_SIZE,
        windowSize % 2 === 0 ? windowSize + 1 : windowSize
    );

    return {
        x: getMagnifierAxisRangeForCoordinate({
            boardCoord: boardX,
            boardSize,
            windowSize: normalizedWindowSize,
        }),
        y: getMagnifierAxisRangeForCoordinate({
            boardCoord: boardY,
            boardSize,
            windowSize: normalizedWindowSize,
        }),
    };
}

export function shouldShowMagnifierRowCoordinates({
    boardX,
    boardY,
    boardSize,
    windowSize,
}: {
    boardX: number;
    boardY: number;
    boardSize: BoardSize;
    windowSize: number;
}) {
    return isMagnifierEdgeVisible({
        boardX,
        boardY,
        boardSize,
        windowSize,
        edge: "left",
    }) || isMagnifierEdgeVisible({
        boardX,
        boardY,
        boardSize,
        windowSize,
        edge: "right",
    });
}

export function shouldShowMagnifierLeftRowCoordinates({
    boardX,
    boardY,
    boardSize,
    windowSize,
}: {
    boardX: number;
    boardY: number;
    boardSize: BoardSize;
    windowSize: number;
}) {
    return isMagnifierEdgeVisible({
        boardX,
        boardY,
        boardSize,
        windowSize,
        edge: "left",
    });
}

export function shouldShowMagnifierRightRowCoordinates({
    boardX,
    boardY,
    boardSize,
    windowSize,
}: {
    boardX: number;
    boardY: number;
    boardSize: BoardSize;
    windowSize: number;
}) {
    return isMagnifierEdgeVisible({
        boardX,
        boardY,
        boardSize,
        windowSize,
        edge: "right",
    });
}

export function shouldShowMagnifierColumnCoordinates({
    boardX,
    boardY,
    boardSize,
    windowSize,
}: {
    boardX: number;
    boardY: number;
    boardSize: BoardSize;
    windowSize: number;
}) {
    return isMagnifierEdgeVisible({
        boardX,
        boardY,
        boardSize,
        windowSize,
        edge: "top",
    }) || isMagnifierEdgeVisible({
        boardX,
        boardY,
        boardSize,
        windowSize,
        edge: "bottom",
    });
}

export function shouldShowMagnifierTopColumnCoordinates({
    boardX,
    boardY,
    boardSize,
    windowSize,
}: {
    boardX: number;
    boardY: number;
    boardSize: BoardSize;
    windowSize: number;
}) {
    return isMagnifierEdgeVisible({
        boardX,
        boardY,
        boardSize,
        windowSize,
        edge: "top",
    });
}

export function shouldShowMagnifierBottomColumnCoordinates({
    boardX,
    boardY,
    boardSize,
    windowSize,
}: {
    boardX: number;
    boardY: number;
    boardSize: BoardSize;
    windowSize: number;
}) {
    return isMagnifierEdgeVisible({
        boardX,
        boardY,
        boardSize,
        windowSize,
        edge: "bottom",
    });
}

export function getMagnifierPositionPercent({
    offset,
    windowSize,
}: {
    offset: number;
    windowSize: number;
}) {
    if (windowSize <= 1) return 50;

    const radius = Math.floor(windowSize / 2);
    return (
        MAGNIFIER_INSET_PERCENT +
        ((offset + radius) * MAGNIFIER_VISIBLE_SPAN_PERCENT) / (windowSize - 1)
    );
}

export function getMagnifierRangePositionPercent({
    offset,
    minOffset,
    maxOffset,
    insetPercent = 0,
}: {
    offset: number;
    minOffset: number;
    maxOffset: number;
    insetPercent?: number;
}) {
    const span = maxOffset - minOffset;
    if (span <= 0) return 50;

    const usableSpan = 100 - insetPercent * 2;
    return insetPercent + ((offset - minOffset) * usableSpan) / span;
}

export function getMagnifierEdgePaddedPositionPercent({
    offset,
    minOffset,
    maxOffset,
    leadingInsetPercent = 0,
    trailingInsetPercent = 0,
}: {
    offset: number;
    minOffset: number;
    maxOffset: number;
    leadingInsetPercent?: number;
    trailingInsetPercent?: number;
}) {
    const span = maxOffset - minOffset;
    if (span <= 0) return 50;

    const usableSpan = 100 - leadingInsetPercent - trailingInsetPercent;
    return (
        leadingInsetPercent + ((offset - minOffset) * usableSpan) / span
    );
}

export function getMagnifierBufferedPositionPercent({
    offset,
    boardCoord,
    boardSize,
    windowSize,
    insetPercent = 0,
}: {
    offset: number;
    boardCoord: number;
    boardSize: BoardSize;
    windowSize: number;
    insetPercent?: number;
}) {
    const radius = Math.floor(windowSize / 2);
    const minOffset = Math.max(-radius, -boardCoord);
    const maxOffset = Math.min(radius, boardSize - 1 - boardCoord);
    const span = maxOffset - minOffset;

    if (span <= 0) return 50;

    const isLeftOrTopEdgeVisible = minOffset === -boardCoord;
    const isRightOrBottomEdgeVisible = maxOffset === boardSize - 1 - boardCoord;

    if (isLeftOrTopEdgeVisible && isRightOrBottomEdgeVisible) {
        return getMagnifierRangePositionPercent({
            offset,
            minOffset,
            maxOffset,
            insetPercent,
        });
    }

    if (isLeftOrTopEdgeVisible) {
        return insetPercent + ((offset - minOffset) * (100 - insetPercent)) / span;
    }

    if (isRightOrBottomEdgeVisible) {
        return ((offset - minOffset) * (100 - insetPercent)) / span;
    }

    return getMagnifierPositionPercent({ offset, windowSize });
}

export function getMagnifierEdgeAlignedPositionPercent({
    offset,
    boardCoord,
    boardSize,
    windowSize,
    insetPercent = 0,
}: {
    offset: number;
    boardCoord: number;
    boardSize: BoardSize;
    windowSize: number;
    insetPercent?: number;
}) {
    const radius = Math.floor(windowSize / 2);
    const minOffset = Math.max(-radius, -boardCoord);
    const maxOffset = Math.min(radius, boardSize - 1 - boardCoord);
    const isEdgeAligned = minOffset !== -radius || maxOffset !== radius;

    if (!isEdgeAligned) {
        return getMagnifierPositionPercent({ offset, windowSize });
    }

    return getMagnifierRangePositionPercent({
        offset,
        minOffset,
        maxOffset,
        insetPercent,
    });
}

export function isMagnifierRangeEdgeVisible({
    boardCoord,
    boardSize,
    range,
    edge,
}: {
    boardCoord: number;
    boardSize: BoardSize;
    range: MagnifierAxisRange;
    edge: "left" | "right" | "top" | "bottom";
}) {
    if (edge === "left" || edge === "top") {
        return range.minOffset <= -boardCoord;
    }

    return range.maxOffset >= boardSize - 1 - boardCoord;
}

export function getMagnifierStoneSizePx({
    windowSize,
    magnifierSizePx = MAGNIFIER_SIZE_PX,
}: {
    windowSize: number;
    magnifierSizePx?: number;
}) {
    if (windowSize <= 0) return 0;

    return magnifierSizePx / windowSize * MAGNIFIER_STONE_SIZE_RATIO;
}

export function getMagnifierRenderModel({
    boardSize,
    boardSignMap,
    touchPreview,
    magnifierViewport,
    showMagnifierLeftRowCoordinates,
    showMagnifierRightRowCoordinates,
    showMagnifierTopColumnCoordinates,
    showMagnifierBottomColumnCoordinates,
    magnifierXLeadingInsetPercent,
    magnifierXTrailingInsetPercent,
    magnifierYLeadingInsetPercent,
    magnifierYTrailingInsetPercent,
    magnifierContentSizePx = MAGNIFIER_SIZE_PX,
    magnifierCoordinateOffsetPx = 8,
    formatColumnLabel,
}: {
    boardSize: BoardSize;
    boardSignMap: number[][];
    touchPreview: { x: number; y: number } | null;
    magnifierViewport: MagnifierSquareViewport | null;
    showMagnifierLeftRowCoordinates: boolean;
    showMagnifierRightRowCoordinates: boolean;
    showMagnifierTopColumnCoordinates: boolean;
    showMagnifierBottomColumnCoordinates: boolean;
    magnifierXLeadingInsetPercent: number;
    magnifierXTrailingInsetPercent: number;
    magnifierYLeadingInsetPercent: number;
    magnifierYTrailingInsetPercent: number;
    magnifierContentSizePx?: number;
    magnifierCoordinateOffsetPx?: number;
    formatColumnLabel: (x: number, y: number, boardSize: BoardSize) => string;
}): MagnifierRenderModel {
    if (!touchPreview || !magnifierViewport) {
        return {
            gridLines: { horizontalLines: [], verticalLines: [] },
            cells: [],
            coordinateLabels: [],
        };
    }

    const getMagnifierContentAxisPositionPx = (percent: number) => {
        return (percent / 100) * magnifierContentSizePx;
    };
    const getMagnifierXPercent = (offset: number) => {
        return getMagnifierEdgePaddedPositionPercent({
            offset,
            minOffset: magnifierViewport.x.minOffset,
            maxOffset: magnifierViewport.x.maxOffset,
            leadingInsetPercent: magnifierXLeadingInsetPercent,
            trailingInsetPercent: magnifierXTrailingInsetPercent,
        });
    };
    const getMagnifierYPercent = (offset: number) => {
        return getMagnifierEdgePaddedPositionPercent({
            offset,
            minOffset: magnifierViewport.y.minOffset,
            maxOffset: magnifierViewport.y.maxOffset,
            leadingInsetPercent: magnifierYLeadingInsetPercent,
            trailingInsetPercent: magnifierYTrailingInsetPercent,
        });
    };

    const cells: MagnifierRenderCell[] = [];

    for (
        let dy = magnifierViewport.y.minOffset;
        dy <= magnifierViewport.y.maxOffset;
        dy += 1
    ) {
        for (
            let dx = magnifierViewport.x.minOffset;
            dx <= magnifierViewport.x.maxOffset;
            dx += 1
        ) {
            const x = touchPreview.x + dx;
            const y = touchPreview.y + dy;
            const isOnBoard = x >= 0 && x < boardSize && y >= 0 && y < boardSize;
            const sign = isOnBoard ? boardSignMap[y][x] : 0;

            cells.push({
                key: `${dx},${dy}`,
                x,
                y,
                dx,
                dy,
                sign,
                isOnBoard,
                isCenter: dx === 0 && dy === 0,
                isStarPoint: isOnBoard && isStarPoint(x, y, boardSize),
                left: getMagnifierContentAxisPositionPx(getMagnifierXPercent(dx)),
                top: getMagnifierContentAxisPositionPx(getMagnifierYPercent(dy)),
            });
        }
    }

    const coordinateLabels: MagnifierCoordinateLabel[] = [];

    if (showMagnifierLeftRowCoordinates) {
        for (
            let dy = magnifierViewport.y.minOffset;
            dy <= magnifierViewport.y.maxOffset;
            dy += 1
        ) {
            const y = touchPreview.y + dy;
            if (y < 0 || y >= boardSize) continue;

            coordinateLabels.push({
                key: `row-${dy}`,
                text: String(boardSize - y),
                left: magnifierCoordinateOffsetPx,
                top: getMagnifierContentAxisPositionPx(getMagnifierYPercent(dy)),
            });
        }
    }

    if (showMagnifierRightRowCoordinates) {
        for (
            let dy = magnifierViewport.y.minOffset;
            dy <= magnifierViewport.y.maxOffset;
            dy += 1
        ) {
            const y = touchPreview.y + dy;
            if (y < 0 || y >= boardSize) continue;

            coordinateLabels.push({
                key: `row-right-${dy}`,
                text: String(boardSize - y),
                left: magnifierContentSizePx - magnifierCoordinateOffsetPx,
                top: getMagnifierContentAxisPositionPx(getMagnifierYPercent(dy)),
            });
        }
    }

    if (showMagnifierTopColumnCoordinates) {
        for (
            let dx = magnifierViewport.x.minOffset;
            dx <= magnifierViewport.x.maxOffset;
            dx += 1
        ) {
            const x = touchPreview.x + dx;
            if (x < 0 || x >= boardSize) continue;

            coordinateLabels.push({
                key: `col-${dx}`,
                text: formatColumnLabel(x, touchPreview.y, boardSize).slice(0, 1),
                left: getMagnifierContentAxisPositionPx(getMagnifierXPercent(dx)),
                top: magnifierCoordinateOffsetPx,
            });
        }
    }

    if (showMagnifierBottomColumnCoordinates) {
        for (
            let dx = magnifierViewport.x.minOffset;
            dx <= magnifierViewport.x.maxOffset;
            dx += 1
        ) {
            const x = touchPreview.x + dx;
            if (x < 0 || x >= boardSize) continue;

            coordinateLabels.push({
                key: `col-bottom-${dx}`,
                text: formatColumnLabel(x, touchPreview.y, boardSize).slice(0, 1),
                left: getMagnifierContentAxisPositionPx(getMagnifierXPercent(dx)),
                top: magnifierContentSizePx - magnifierCoordinateOffsetPx,
            });
        }
    }

    const horizontalLines: MagnifierHorizontalLine[] = [];
    const verticalLines: MagnifierVerticalLine[] = [];

    for (
        let dy = magnifierViewport.y.minOffset;
        dy <= magnifierViewport.y.maxOffset;
        dy += 1
    ) {
        const y = touchPreview.y + dy;
        if (y < 0 || y >= boardSize) continue;

        const onBoardDxValues = Array.from(
            {
                length:
                    magnifierViewport.x.maxOffset -
                    magnifierViewport.x.minOffset +
                    1,
            },
            (_, index) => magnifierViewport.x.minOffset + index
        ).filter((dx) => {
            const x = touchPreview.x + dx;
            return x >= 0 && x < boardSize;
        });

        if (onBoardDxValues.length === 0) continue;

        const firstDx = onBoardDxValues[0];
        const lastDx = onBoardDxValues[onBoardDxValues.length - 1];
        const boardContinuesLeft = touchPreview.x + firstDx > 0;
        const boardContinuesRight = touchPreview.x + lastDx < boardSize - 1;

        horizontalLines.push({
            key: `h-${dy}`,
            top: getMagnifierYPercent(dy),
            left: boardContinuesLeft ? 0 : getMagnifierXPercent(firstDx),
            right: boardContinuesRight ? 100 : getMagnifierXPercent(lastDx),
        });
    }

    for (
        let dx = magnifierViewport.x.minOffset;
        dx <= magnifierViewport.x.maxOffset;
        dx += 1
    ) {
        const x = touchPreview.x + dx;
        if (x < 0 || x >= boardSize) continue;

        const onBoardDyValues = Array.from(
            {
                length:
                    magnifierViewport.y.maxOffset -
                    magnifierViewport.y.minOffset +
                    1,
            },
            (_, index) => magnifierViewport.y.minOffset + index
        ).filter((dy) => {
            const y = touchPreview.y + dy;
            return y >= 0 && y < boardSize;
        });

        if (onBoardDyValues.length === 0) continue;

        const firstDy = onBoardDyValues[0];
        const lastDy = onBoardDyValues[onBoardDyValues.length - 1];
        const boardContinuesTop = touchPreview.y + firstDy > 0;
        const boardContinuesBottom = touchPreview.y + lastDy < boardSize - 1;

        verticalLines.push({
            key: `v-${dx}`,
            left: getMagnifierXPercent(dx),
            top: boardContinuesTop ? 0 : getMagnifierYPercent(firstDy),
            bottom: boardContinuesBottom ? 100 : getMagnifierYPercent(lastDy),
        });
    }

    return {
        gridLines: {
            horizontalLines,
            verticalLines,
        },
        cells,
        coordinateLabels,
    };
}
