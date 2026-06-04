import { describe, expect, it } from "vitest";

import {
    MAGNIFIER_INSET_PERCENT,
    MAGNIFIER_SIZE_PX,
    getMagnifierBufferedPositionPercent,
    getMagnifierEdgePaddedPositionPercent,
    getMagnifierRenderModel,
    getMagnifierWindowBoundsForBoardSize,
    getMagnifierPositionPercent,
    getMagnifierStoneSizePx,
    getMagnifierWindowSize,
    getMagnifierSquareViewport,
    shouldShowMagnifierBottomColumnCoordinates,
    shouldShowMagnifierColumnCoordinates,
    shouldShowMagnifierLeftRowCoordinates,
    shouldShowMagnifierRightRowCoordinates,
} from "../lib/magnifier";

function createEmptySignMap(size: number) {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

function createMagnifierRenderModel({
    boardX,
    boardY,
    signMap = createEmptySignMap(19),
    showLeft,
    showRight,
    showTop,
    showBottom,
}: {
    boardX: number;
    boardY: number;
    signMap?: number[][];
    showLeft: boolean;
    showRight: boolean;
    showTop: boolean;
    showBottom: boolean;
}) {
    const boardSize = 19;
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

    return getMagnifierRenderModel({
        boardSize,
        boardSignMap: createEmptySignMap(boardSize),
        touchPreview: { x: boardX, y: boardY },
        magnifierViewport: viewport,
        showMagnifierLeftRowCoordinates: showLeft,
        showMagnifierRightRowCoordinates: showRight,
        showMagnifierTopColumnCoordinates: showTop,
        showMagnifierBottomColumnCoordinates: showBottom,
        magnifierXLeadingInsetPercent: showLeft ? MAGNIFIER_INSET_PERCENT : 0,
        magnifierXTrailingInsetPercent: showRight ? MAGNIFIER_INSET_PERCENT : 0,
        magnifierYLeadingInsetPercent: showTop ? MAGNIFIER_INSET_PERCENT : 0,
        magnifierYTrailingInsetPercent: showBottom ? MAGNIFIER_INSET_PERCENT : 0,
        formatColumnLabel: (x) => String(x),
    });
}

function getCenterCellLeft(model: ReturnType<typeof createMagnifierRenderModel>) {
    const centerCell = model.cells.find((cell) => cell.isCenter);

    if (!centerCell) {
        throw new Error("expected a center cell");
    }

    return centerCell.left;
}

function getCenterCellTop(model: ReturnType<typeof createMagnifierRenderModel>) {
    const centerCell = model.cells.find((cell) => cell.isCenter);

    if (!centerCell) {
        throw new Error("expected a center cell");
    }

    return centerCell.top;
}

function getLineByKey<
    T extends { key: string }
>(lines: T[], key: string) {
    const line = lines.find((entry) => entry.key === key);

    if (!line) {
        throw new Error(`expected line ${key}`);
    }

    return line;
}

describe("magnifier sizing", () => {
    it("uses board-size-specific magnifier limits", () => {
        expect(getMagnifierWindowBoundsForBoardSize(9)).toEqual({
            minWindowSize: 5,
            maxWindowSize: 7,
        });
        expect(getMagnifierWindowBoundsForBoardSize(13)).toEqual({
            minWindowSize: 7,
            maxWindowSize: 9,
        });
        expect(getMagnifierWindowBoundsForBoardSize(19)).toEqual({
            minWindowSize: 7,
            maxWindowSize: 9,
        });
    });

    it("keeps the smallest window when edge and stone cues are already visible", () => {
        const signMap = createEmptySignMap(19);
        signMap[1][2] = 1;

        expect(
            getMagnifierWindowSize({
                boardX: 1,
                boardY: 1,
                boardSize: 19,
                signMap,
            })
        ).toBe(7);
    });

    it("expands until a second cue becomes visible", () => {
        expect(
            getMagnifierWindowSize({
                boardX: 5,
                boardY: 3,
                boardSize: 19,
                signMap: createEmptySignMap(19),
            })
        ).toBe(7);
    });

    it("falls back to the maximum window when the rule cannot be satisfied exactly", () => {
        expect(
            getMagnifierWindowSize({
                boardX: 9,
                boardY: 9,
                boardSize: 19,
                signMap: createEmptySignMap(19),
            })
        ).toBe(9);
    });

    it("keeps 9x9 boards within a 7x7 cap", () => {
        expect(
            getMagnifierWindowSize({
                boardX: 4,
                boardY: 4,
                boardSize: 9,
                signMap: createEmptySignMap(9),
            })
        ).toBe(7);
    });

    it("allows 9x9 boards to use a 5x5 minimum window near the corner", () => {
        expect(
            getMagnifierWindowSize({
                boardX: 1,
                boardY: 1,
                boardSize: 9,
                signMap: createEmptySignMap(9),
            })
        ).toBe(5);
    });

    it("keeps the current 7x7 spacing math when window size is seven", () => {
        expect(
            getMagnifierPositionPercent({
                offset: -3,
                windowSize: 7,
            })
        ).toBeCloseTo(12.5);
        expect(
            getMagnifierPositionPercent({
                offset: 0,
                windowSize: 7,
            })
        ).toBeCloseTo(50);
        expect(
            getMagnifierPositionPercent({
                offset: 3,
                windowSize: 7,
            })
        ).toBeCloseTo(87.5);
    });

    it("adds padding only on the clipped board edge", () => {
        expect(
            getMagnifierBufferedPositionPercent({
                offset: -1,
                boardCoord: 1,
                boardSize: 19,
                windowSize: 7,
                insetPercent: 12.5,
            })
        ).toBeCloseTo(12.5);
        expect(
            getMagnifierBufferedPositionPercent({
                offset: 3,
                boardCoord: 1,
                boardSize: 19,
                windowSize: 7,
                insetPercent: 12.5,
            })
        ).toBeCloseTo(100);
        expect(
            getMagnifierBufferedPositionPercent({
                offset: -3,
                boardCoord: 17,
                boardSize: 19,
                windowSize: 7,
                insetPercent: 12.5,
            })
        ).toBeCloseTo(0);
        expect(
            getMagnifierBufferedPositionPercent({
                offset: 1,
                boardCoord: 17,
                boardSize: 19,
                windowSize: 7,
                insetPercent: 12.5,
            })
        ).toBeCloseTo(87.5);
    });

    it.each([
        ["b2", 1, 17],
        ["b18", 1, 1],
        ["s2", 18, 17],
        ["s18", 18, 1],
    ])("keeps %s at a 7x7 magnifier size on an empty board", (_label, boardX, boardY) => {
        expect(
            getMagnifierWindowSize({
                boardX,
                boardY,
                boardSize: 19,
                signMap: createEmptySignMap(19),
            })
        ).toBe(7);
    });

    it.each([
        ["b2", 1, 17, { left: true, right: false, top: false, bottom: true }],
        ["b18", 1, 1, { left: true, right: false, top: true, bottom: false }],
        ["s2", 18, 17, { left: false, right: true, top: false, bottom: true }],
        ["s18", 18, 1, { left: false, right: true, top: true, bottom: false }],
    ])(
        "shows the expected edge coordinates for %s",
        (_label, boardX, boardY, expectedEdges) => {
            const model = createMagnifierRenderModel({
                boardX,
                boardY,
                showLeft: expectedEdges.left,
                showRight: expectedEdges.right,
                showTop: expectedEdges.top,
                showBottom: expectedEdges.bottom,
            });

            const labelKeys = model.coordinateLabels.map((label) => label.key);
            const hasLeftRowLabels = labelKeys.some(
                (key) => key.startsWith("row-") && !key.startsWith("row-right-")
            );
            const hasRightRowLabels = labelKeys.some((key) =>
                key.startsWith("row-right-")
            );
            const hasTopColumnLabels = labelKeys.some(
                (key) => key.startsWith("col-") && !key.startsWith("col-bottom-")
            );
            const hasBottomColumnLabels = labelKeys.some((key) =>
                key.startsWith("col-bottom-")
            );

            expect(hasLeftRowLabels).toBe(expectedEdges.left);
            expect(hasRightRowLabels).toBe(expectedEdges.right);
            expect(hasTopColumnLabels).toBe(expectedEdges.top);
            expect(hasBottomColumnLabels).toBe(expectedEdges.bottom);
        }
    );

    it("keeps the preview stone position stepping uniformly across A19, B19, and C19", () => {
        const a19 = createMagnifierRenderModel({
            boardX: 0,
            boardY: 0,
            showLeft: true,
            showRight: false,
            showTop: true,
            showBottom: false,
        });
        const b19 = createMagnifierRenderModel({
            boardX: 1,
            boardY: 0,
            showLeft: true,
            showRight: false,
            showTop: true,
            showBottom: false,
        });
        const c19 = createMagnifierRenderModel({
            boardX: 2,
            boardY: 0,
            showLeft: true,
            showRight: false,
            showTop: true,
            showBottom: false,
        });

        const a19Left = getCenterCellLeft(a19);
        const b19Left = getCenterCellLeft(b19);
        const c19Left = getCenterCellLeft(c19);

        expect(b19Left - a19Left).toBeCloseTo(c19Left - b19Left);
    });

    it("keeps the preview stone centered on the grid intersection for A19, B19, and C19", () => {
        const cases = [
            { label: "A19", boardX: 0, boardY: 0 },
            { label: "B19", boardX: 1, boardY: 0 },
            { label: "C19", boardX: 2, boardY: 0 },
        ];

        for (const { boardX, boardY } of cases) {
            const model = createMagnifierRenderModel({
                boardX,
                boardY,
                showLeft: true,
                showRight: false,
                showTop: true,
                showBottom: false,
            });

            const centerLeft = getCenterCellLeft(model);
            const centerTop = getCenterCellTop(model);
            const centerVerticalLine = getLineByKey(model.gridLines.verticalLines, "v-0");
            const centerHorizontalLine = getLineByKey(
                model.gridLines.horizontalLines,
                "h-0"
            );
            const lineLeftPx = (centerVerticalLine.left / 100) * MAGNIFIER_SIZE_PX;
            const lineTopPx = (centerHorizontalLine.top / 100) * MAGNIFIER_SIZE_PX;

            expect(centerLeft).toBeCloseTo(lineLeftPx);
            expect(centerTop).toBeCloseTo(lineTopPx);
        }
    });

    it("pads only the visible board edge while keeping square spacing", () => {
        expect(
            getMagnifierEdgePaddedPositionPercent({
                offset: -5,
                minOffset: -5,
                maxOffset: 0,
                trailingInsetPercent: 12.5,
            })
        ).toBeCloseTo(0);
        expect(
            getMagnifierEdgePaddedPositionPercent({
                offset: 0,
                minOffset: -5,
                maxOffset: 0,
                trailingInsetPercent: 12.5,
            })
        ).toBeCloseTo(87.5);
        expect(
            getMagnifierEdgePaddedPositionPercent({
                offset: -1,
                minOffset: -1,
                maxOffset: 4,
                leadingInsetPercent: 12.5,
            })
        ).toBeCloseTo(12.5);
        expect(
            getMagnifierEdgePaddedPositionPercent({
                offset: 4,
                minOffset: -1,
                maxOffset: 4,
                leadingInsetPercent: 12.5,
            })
        ).toBeCloseTo(100);
    });

    it("scales the preview stone proportionally with the magnifier grid size", () => {
        const stoneSizeAtFive = getMagnifierStoneSizePx({
            windowSize: 7,
        });
        const stoneSizeAtNine = getMagnifierStoneSizePx({
            windowSize: 9,
        });

        expect(stoneSizeAtFive).toBeGreaterThan(stoneSizeAtNine);
        expect(stoneSizeAtFive / stoneSizeAtNine).toBeCloseTo(9 / 7);
    });

    it("only shows row coordinates when the left edge is visible", () => {
        expect(
            shouldShowMagnifierLeftRowCoordinates({
                boardX: 9,
                boardY: 9,
                boardSize: 19,
                windowSize: 7,
            })
        ).toBe(false);
        expect(
            shouldShowMagnifierLeftRowCoordinates({
                boardX: 1,
                boardY: 9,
                boardSize: 19,
                windowSize: 7,
            })
        ).toBe(true);
    });

    it("only shows row coordinates when the right edge is visible", () => {
        expect(
            shouldShowMagnifierRightRowCoordinates({
                boardX: 9,
                boardY: 9,
                boardSize: 19,
                windowSize: 7,
            })
        ).toBe(false);
        expect(
            shouldShowMagnifierRightRowCoordinates({
                boardX: 17,
                boardY: 9,
                boardSize: 19,
                windowSize: 7,
            })
        ).toBe(true);
    });

    it("only shows column coordinates when the top edge is visible", () => {
        expect(
            shouldShowMagnifierColumnCoordinates({
                boardX: 9,
                boardY: 1,
                boardSize: 19,
                windowSize: 7,
            })
        ).toBe(true);
        expect(
            shouldShowMagnifierColumnCoordinates({
                boardX: 9,
                boardY: 17,
                boardSize: 19,
                windowSize: 7,
            })
        ).toBe(true);
        expect(
            shouldShowMagnifierColumnCoordinates({
                boardX: 9,
                boardY: 9,
                boardSize: 19,
                windowSize: 7,
            })
        ).toBe(false);
    });

    it("only shows bottom column coordinates when the bottom edge is visible", () => {
        expect(
            shouldShowMagnifierBottomColumnCoordinates({
                boardX: 9,
                boardY: 9,
                boardSize: 19,
                windowSize: 7,
            })
        ).toBe(false);
        expect(
            shouldShowMagnifierBottomColumnCoordinates({
                boardX: 9,
                boardY: 17,
                boardSize: 19,
                windowSize: 7,
            })
        ).toBe(true);
    });
});
