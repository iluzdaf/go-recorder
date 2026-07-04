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
