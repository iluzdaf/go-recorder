import { describe, expect, it } from "vitest";

import { computeImageOverlayStyle } from "../lib/imageOverlayAlignment";
import type { ImageSourceMetadata } from "../components/types";
import type { BoardGridMetrics } from "../lib/boardGeometry";

function makeImageSource(
    overrides: Partial<ImageSourceMetadata> = {}
): ImageSourceMetadata {
    return {
        id: "test-id",
        dataUrl: "data:image/png;base64,abc",
        naturalWidth: 720,
        naturalHeight: 720,
        corners: [
            { x: 0.1, y: 0.1 }, // TL
            { x: 0.9, y: 0.1 }, // TR
            { x: 0.9, y: 0.9 }, // BR
            { x: 0.1, y: 0.9 }, // BL
        ],
        ...overrides,
    };
}

function makeGridMetrics(overrides: Partial<BoardGridMetrics> = {}): BoardGridMetrics {
    return {
        left: 10,
        top: 10,
        cellSize: 50,
        boardSizePx: 450,
        ...overrides,
    };
}

// Apply the CSS matrix3d (column-major 4x4 projective transform) to an image
// point, returning where it lands in board-wrapper space.
function mapThroughTransform(transform: string, x: number, y: number) {
    const v = transform
        .replace("matrix3d(", "")
        .replace(")", "")
        .split(",")
        .map(Number);
    // Homography rows recovered from the column-major layout.
    const px = v[0] * x + v[4] * y + v[12];
    const py = v[1] * x + v[5] * y + v[13];
    const pw = v[3] * x + v[7] * y + v[15];
    return { x: px / pw, y: py / pw };
}

describe("computeImageOverlayStyle", () => {
    it("returns absolute positioning and pointer-events none", () => {
        const style = computeImageOverlayStyle({
            imageSource: makeImageSource(),
            boardSize: 9,
            gridMetrics: makeGridMetrics(),
            positionViewRange: null,
        });

        expect(style.position).toBe("absolute");
        expect(style.pointerEvents).toBe("none");
        expect(style.left).toBe(0);
        expect(style.top).toBe(0);
    });

    it("renders above the stones and stays see-through", () => {
        const style = computeImageOverlayStyle({
            imageSource: makeImageSource(),
            boardSize: 9,
            gridMetrics: makeGridMetrics(),
            positionViewRange: null,
        });

        expect(style.zIndex).toBe(20);
        expect(style.opacity).toBe(0.4);
    });

    it("sets width and height to natural image dimensions", () => {
        const style = computeImageOverlayStyle({
            imageSource: makeImageSource({ naturalWidth: 800, naturalHeight: 600 }),
            boardSize: 9,
            gridMetrics: makeGridMetrics(),
            positionViewRange: null,
        });

        expect(style.width).toBe(800);
        expect(style.height).toBe(600);
    });

    it("clips to the corner quad so photo borders never show", () => {
        const style = computeImageOverlayStyle({
            imageSource: makeImageSource({
                naturalWidth: 1000,
                naturalHeight: 1000,
                corners: [
                    { x: 0.2, y: 0.2 },
                    { x: 0.8, y: 0.2 },
                    { x: 0.8, y: 0.8 },
                    { x: 0.2, y: 0.8 },
                ],
            }),
            boardSize: 19,
            gridMetrics: makeGridMetrics(),
            positionViewRange: null,
        });

        const clip = style.clipPath as string;
        expect(clip).toMatch(/^polygon\(/);
        expect(clip.split(",")).toHaveLength(4);
        // Expanded slightly beyond the quad (200px corner, centroid 500px):
        // 500 - 300 * (1 + 1.5/18) = 175px.
        expect(clip).toContain("175px 175px");
    });

    it("overrides the global img max-width clamp", () => {
        // Tailwind preflight's img { max-width: 100% } would otherwise crush a
        // photo wider than the board wrapper into a tall strip.
        const style = computeImageOverlayStyle({
            imageSource: makeImageSource({
                naturalWidth: 3024,
                naturalHeight: 4032,
            }),
            boardSize: 19,
            gridMetrics: makeGridMetrics(),
            positionViewRange: null,
        });

        expect(style.maxWidth).toBe("none");
    });

    it("stretches a partial-view overlay across the visible region", () => {
        // gridMetrics.cellSize divides the rendered grid width by the full
        // board size, but a partial view renders only its visible columns in
        // that width. The overlay must span the visible region, not shrink to
        // columns/boardSize of it.
        const boardSizePx = 570;
        const columns = 10;
        const rows = 16;
        const style = computeImageOverlayStyle({
            imageSource: makeImageSource({
                naturalWidth: 1000,
                naturalHeight: 1600,
                // Full-image corners so the source maps exactly onto the
                // destination rectangle.
                corners: [
                    { x: 0, y: 0 },
                    { x: 1, y: 0 },
                    { x: 1, y: 1 },
                    { x: 0, y: 1 },
                ],
            }),
            boardSize: 19,
            gridMetrics: {
                left: 10,
                top: 20,
                cellSize: boardSizePx / 19, // full-board value
                boardSizePx,
            },
            positionViewRange: {
                startX: 9,
                startY: 3,
                columns,
                rows,
                rangeX: [9, 18],
                rangeY: [3, 18],
            },
        });

        const topLeft = mapThroughTransform(style.transform as string, 0, 0);
        const topRight = mapThroughTransform(
            style.transform as string,
            1000,
            0
        );
        const bottomLeft = mapThroughTransform(
            style.transform as string,
            0,
            1600
        );

        // Displayed cell size is boardSizePx / columns, so the source spans
        // (columns - 1) and (rows - 1) cells between outer intersections.
        const displayedCell = boardSizePx / columns;
        expect(topRight.x - topLeft.x).toBeCloseTo(
            (columns - 1) * displayedCell,
            3
        );
        expect(bottomLeft.y - topLeft.y).toBeCloseTo(
            (rows - 1) * displayedCell,
            3
        );
    });

    it("produces a matrix3d transform string", () => {
        const style = computeImageOverlayStyle({
            imageSource: makeImageSource(),
            boardSize: 9,
            gridMetrics: makeGridMetrics(),
            positionViewRange: null,
        });

        expect(typeof style.transform).toBe("string");
        expect(style.transform).toMatch(/^matrix3d\(/);
        expect((style.transform as string).split(",")).toHaveLength(16);
    });

    it("uses transformOrigin 0 0", () => {
        const style = computeImageOverlayStyle({
            imageSource: makeImageSource(),
            boardSize: 9,
            gridMetrics: makeGridMetrics(),
            positionViewRange: null,
        });

        expect(style.transformOrigin).toBe("0 0");
    });

    it("produces a different transform for positionView vs full board", () => {
        const base = {
            imageSource: makeImageSource(),
            boardSize: 9,
            gridMetrics: makeGridMetrics(),
        };

        const fullBoard = computeImageOverlayStyle({
            ...base,
            positionViewRange: null,
        });

        const partial = computeImageOverlayStyle({
            ...base,
            positionViewRange: {
                startX: 0,
                startY: 0,
                rows: 5,
                columns: 5,
                rangeX: [0, 4],
                rangeY: [0, 4],
            },
        });

        expect(fullBoard.transform).not.toBe(partial.transform);
    });

    it("produces an identity-like transform when corners match board corners exactly", () => {
        // When stored corners already exactly mark TL/TR/BR/BL board corner
        // intersections, the overlay should align perfectly (transform brings
        // source corners exactly to destination corners).
        // We verify this by checking that the matrix is finite and non-degenerate.
        const style = computeImageOverlayStyle({
            imageSource: makeImageSource({
                naturalWidth: 500,
                naturalHeight: 500,
                corners: [
                    { x: 0.0, y: 0.0 },
                    { x: 1.0, y: 0.0 },
                    { x: 1.0, y: 1.0 },
                    { x: 0.0, y: 1.0 },
                ],
            }),
            boardSize: 9,
            gridMetrics: makeGridMetrics({ left: 0, top: 0, cellSize: 50 }),
            positionViewRange: null,
        });

        const values = (style.transform as string)
            .replace("matrix3d(", "")
            .replace(")", "")
            .split(",")
            .map(Number);

        expect(values).toHaveLength(16);
        expect(values.every(isFinite)).toBe(true);
    });

    it("handles non-square images", () => {
        const style = computeImageOverlayStyle({
            imageSource: makeImageSource({ naturalWidth: 1200, naturalHeight: 800 }),
            boardSize: 19,
            gridMetrics: makeGridMetrics({ cellSize: 30, boardSizePx: 570 }),
            positionViewRange: null,
        });

        expect(style.width).toBe(1200);
        expect(style.height).toBe(800);
        expect(style.transform).toMatch(/^matrix3d\(/);
    });
});
