import { describe, expect, it } from "vitest";

import {
    createDefaultBoardGridMetrics,
    getLiveBoardGridMetrics,
    getLivePositionViewGridMetrics,
    getBoardVertexSize,
} from "../lib/boardGeometry";

describe("board geometry helpers", () => {
    it("sizes vertices from the smaller available board dimension", () => {
        expect(
            getBoardVertexSize({ boardSize: 19, width: 520, height: 420 })
        ).toBeCloseTo((420 - 4) / 21);
    });

    it("keeps a minimum touch-friendly vertex size", () => {
        expect(
            getBoardVertexSize({ boardSize: 19, width: 120, height: 120 })
        ).toBe(16);
    });

    it("accounts for board size when sizing vertices", () => {
        expect(
            getBoardVertexSize({ boardSize: 9, width: 320, height: 320 })
        ).toBeCloseTo((320 - 4) / 11);
    });

    it("uses reclaimed coordinate label space when coordinates are hidden", () => {
        const withCoordinates = getBoardVertexSize({
            boardSize: 19,
            showCoordinates: true,
            width: 416,
            height: 416,
        });
        const withoutCoordinates = getBoardVertexSize({
            boardSize: 19,
            showCoordinates: false,
            width: 416,
            height: 416,
        });

        expect(withCoordinates).toBeCloseTo((416 - 4) / 21);
        expect(withoutCoordinates).toBeCloseTo((416 - 4) / 19);
        expect(withoutCoordinates).toBeGreaterThan(withCoordinates);
    });

    it("does not reserve outer layout padding when coordinates are hidden", () => {
        expect(
            getBoardVertexSize({
                boardSize: 19,
                showCoordinates: false,
                width: 399,
                height: 399,
            })
        ).toBeCloseTo((399 - 4) / 19);
        expect(
            getBoardVertexSize({
                boardSize: 19,
                showCoordinates: true,
                width: 399,
                height: 399,
            })
        ).toBeCloseTo((399 - 4) / 21);
    });

    it("does not reserve outer layout padding when coordinates are visible", () => {
        expect(
            getBoardVertexSize({
                boardSize: 19,
                showCoordinates: true,
                width: 416,
                height: 416,
            })
        ).toBeCloseTo((416 - 4) / 21);
    });

    it("creates default grid metrics from board size and vertex size", () => {
        expect(createDefaultBoardGridMetrics(13, 18)).toEqual({
            left: 0,
            top: 0,
            cellSize: 18,
            boardSizePx: 234,
        });
    });

    it("measures live Shudan grid metrics from the wrapper and grid bounds", () => {
        const grid = {
            getBoundingClientRect: () => ({
                left: 48,
                top: 72,
                width: 380,
            }),
        } as Element;
        const wrapper = {
            getBoundingClientRect: () => ({
                left: 20,
                top: 30,
            }),
            querySelector: (selector: string) =>
                selector === ".shudan-grid" ? grid : null,
        } as Element;

        expect(
            getLiveBoardGridMetrics({
                boardSize: 19,
                gobanWrapper: wrapper,
            })
        ).toEqual({
            gridGeometry: {
                left: 48,
                top: 72,
                cellSize: 20,
                boardSize: 19,
            },
            gridMetrics: {
                left: 28,
                top: 42,
                cellSize: 20,
                boardSizePx: 380,
            },
        });
    });

    it("returns null when the Shudan grid is unavailable", () => {
        const wrapper = {
            querySelector: () => null,
        } as unknown as Element;

        expect(
            getLiveBoardGridMetrics({
                boardSize: 19,
                gobanWrapper: wrapper,
            })
        ).toBeNull();
    });

    it("measures cropped position view grid metrics", () => {
        const grid = {
            getBoundingClientRect: () => ({
                left: 48,
                top: 72,
                width: 320,
            }),
        } as Element;
        const wrapper = {
            querySelector: (selector: string) =>
                selector === ".shudan-grid" ? grid : null,
        } as Element;

        expect(
            getLivePositionViewGridMetrics({
                columns: 8,
                rows: 6,
                startX: 11,
                startY: 13,
                gobanWrapper: wrapper,
            })
        ).toEqual({
            left: 48,
            top: 72,
            cellSize: 40,
            rows: 6,
            columns: 8,
            startX: 11,
            startY: 13,
        });
    });
});
