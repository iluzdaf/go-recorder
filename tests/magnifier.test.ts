import { describe, expect, it } from "vitest";

import type { BoardSize } from "../components/types";
import {
    getMagnifierRenderModel,
    getMagnifierSquareViewport,
    getMagnifierWindowSize,
} from "../lib/magnifier";

function createEmptySignMap(size: number) {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

function buildMagnifierCellCount({
    boardSize,
    boardX,
    boardY,
}: {
    boardSize: BoardSize;
    boardX: number;
    boardY: number;
}) {
    const signMap = createEmptySignMap(boardSize);
    const windowSize = getMagnifierWindowSize({
        boardX,
        boardY,
        boardSize,
        signMap,
    });
    const viewport = getMagnifierSquareViewport({
        boardX,
        boardY,
        boardSize,
        windowSize,
    });
    const model = getMagnifierRenderModel({
        boardSize,
        boardSignMap: signMap,
        touchPreview: { x: boardX, y: boardY },
        magnifierViewport: viewport,
        showMagnifierLeftRowCoordinates: false,
        showMagnifierRightRowCoordinates: false,
        showMagnifierTopColumnCoordinates: false,
        showMagnifierBottomColumnCoordinates: false,
        magnifierXLeadingInsetPercent: 0,
        magnifierXTrailingInsetPercent: 0,
        magnifierYLeadingInsetPercent: 0,
        magnifierYTrailingInsetPercent: 0,
        formatColumnLabel: (x) => String(x),
    });

    return {
        windowSize,
        cellCount: model.cells.length,
    };
}

describe("magnifier render size", () => {
    it.each([
        ["9x9 corner", 9 as BoardSize, 0, 0, 5],
        ["9x9 tengen", 9 as BoardSize, 4, 4, 7],
        ["19x19 corner", 19 as BoardSize, 0, 0, 7],
        ["19x19 tengen", 19 as BoardSize, 9, 9, 9],
    ])(
        "renders a %s magnifier with a square %dx%d grid",
        (_label, boardSize, boardX, boardY, expectedSide) => {
            const { windowSize, cellCount } = buildMagnifierCellCount({
                boardSize,
                boardX,
                boardY,
            });

            expect(windowSize).toBe(expectedSide);
            expect(cellCount).toBe(expectedSide * expectedSide);
        }
    );
});
