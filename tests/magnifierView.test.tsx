// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import MagnifierView from "../components/MagnifierView";
import {
    MAGNIFIER_INSET_PERCENT,
    MAGNIFIER_SIZE_PX,
    MAGNIFIER_STONE_SIZE_RATIO,
    getMagnifierRenderModel,
    getMagnifierSquareViewport,
    getMagnifierWindowSize,
    shouldShowMagnifierBottomColumnCoordinates,
    shouldShowMagnifierLeftRowCoordinates,
    shouldShowMagnifierRightRowCoordinates,
    shouldShowMagnifierTopColumnCoordinates,
} from "../lib/magnifier";

(globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

function createEmptySignMap(size: number) {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

function renderMagnifier(boardX: number, boardY: number) {
    const boardSize = 19;
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
    const showLeft = shouldShowMagnifierLeftRowCoordinates({
        boardX,
        boardY,
        boardSize,
        windowSize,
    });
    const showRight = shouldShowMagnifierRightRowCoordinates({
        boardX,
        boardY,
        boardSize,
        windowSize,
    });
    const showTop = shouldShowMagnifierTopColumnCoordinates({
        boardX,
        boardY,
        boardSize,
        windowSize,
    });
    const showBottom = shouldShowMagnifierBottomColumnCoordinates({
        boardX,
        boardY,
        boardSize,
        windowSize,
    });
    const renderModel = getMagnifierRenderModel({
        boardSize,
        boardSignMap: signMap,
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

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
        root.render(
            <MagnifierView
                isDarkMode={false}
                left={0}
                top={0}
                magnifierStoneSizePx={
                    (MAGNIFIER_SIZE_PX / windowSize) * MAGNIFIER_STONE_SIZE_RATIO
                }
                horizontalLines={renderModel.gridLines.horizontalLines}
                verticalLines={renderModel.gridLines.verticalLines}
                cells={renderModel.cells}
                coordinateLabels={renderModel.coordinateLabels}
            />
        );
    });

    return {
        container,
        root,
        renderModel,
    };
}

function cleanupRoot(root: Root, container: HTMLElement) {
    act(() => {
        root.unmount();
    });
    container.remove();
}

describe("MagnifierView DOM", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    it.each([
        ["A19", 0, 0],
        ["B19", 1, 0],
        ["C19", 2, 0],
    ])("keeps the center cell aligned for %s", (_label, boardX, boardY) => {
        const { container, root } = renderMagnifier(boardX, boardY);

        const centerCell = container.querySelector(
            '[data-cell-key="0,0"]'
        ) as HTMLElement | null;
        const previewRing = container.querySelector(
            '[data-testid="preview-ring"]'
        ) as HTMLElement | null;
        const verticalLine = container.querySelector(
            '[data-line-key="v-0"]'
        ) as HTMLElement | null;
        const horizontalLine = container.querySelector(
            '[data-line-key="h-0"]'
        ) as HTMLElement | null;

        expect(centerCell).not.toBeNull();
        expect(previewRing).not.toBeNull();
        expect(verticalLine).not.toBeNull();
        expect(horizontalLine).not.toBeNull();

        const cellLeft = Number.parseFloat(centerCell?.style.left ?? "NaN");
        const cellTop = Number.parseFloat(centerCell?.style.top ?? "NaN");
        const lineLeft = Number.parseFloat(verticalLine?.style.left ?? "NaN");
        const lineTop = Number.parseFloat(horizontalLine?.style.top ?? "NaN");
        const lineLeftPx = (lineLeft / 100) * MAGNIFIER_SIZE_PX;
        const lineTopPx = (lineTop / 100) * MAGNIFIER_SIZE_PX;

        expect(cellLeft).toBeCloseTo(lineLeftPx);
        expect(cellTop).toBeCloseTo(lineTopPx);
        expect(previewRing?.className).toContain("left-1/2");
        expect(previewRing?.className).toContain("top-1/2");
        expect(previewRing?.style.transform).toBe("translate(-50%, -50%)");

        cleanupRoot(root, container);
    });

});
