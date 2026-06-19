import type { CSSProperties } from "react";

import type { ImageSourceMetadata } from "../components/types";
import type { BoardGridMetrics } from "./boardGeometry";
import type { PositionViewRange } from "./positionView";

type Point = { x: number; y: number };

// 3x3 matrix adjugate (row-major)
function adj(m: number[]): number[] {
    return [
        m[4] * m[8] - m[5] * m[7],
        m[2] * m[7] - m[1] * m[8],
        m[1] * m[5] - m[2] * m[4],
        m[5] * m[6] - m[3] * m[8],
        m[0] * m[8] - m[2] * m[6],
        m[2] * m[3] - m[0] * m[5],
        m[3] * m[7] - m[4] * m[6],
        m[1] * m[6] - m[0] * m[7],
        m[0] * m[4] - m[1] * m[3],
    ];
}

function multmm(a: number[], b: number[]): number[] {
    const c = Array<number>(9);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            let v = 0;
            for (let k = 0; k < 3; k++) v += a[3 * i + k] * b[3 * k + j];
            c[3 * i + j] = v;
        }
    }
    return c;
}

function multmv(m: number[], v: number[]): number[] {
    return [
        m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
        m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
        m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
    ];
}

// Map basis (unit square corners) to 4 arbitrary points
function basisToPoints(p1: Point, p2: Point, p3: Point, p4: Point): number[] {
    const m = [p1.x, p2.x, p3.x, p1.y, p2.y, p3.y, 1, 1, 1];
    const v = multmv(adj(m), [p4.x, p4.y, 1]);
    return multmm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

// Compute CSS matrix3d values for a projective transform mapping src quad → dst quad.
// Points are ordered TL, TR, BR, BL.
function projectiveMatrix(
    src: [Point, Point, Point, Point],
    dst: [Point, Point, Point, Point]
): number[] {
    const s = basisToPoints(src[0], src[1], src[2], src[3]);
    const d = basisToPoints(dst[0], dst[1], dst[2], dst[3]);
    const m = multmm(d, adj(s));
    for (let i = 0; i < 9; i++) m[i] /= m[8];
    // 3x3 row-major homography → column-major 4x4 CSS matrix3d
    return [
        m[0], m[3], 0, m[6],
        m[1], m[4], 0, m[7],
        0,    0,    1, 0,
        m[2], m[5], 0, m[8],
    ];
}

type ImageOverlayStyleParams = {
    imageSource: ImageSourceMetadata;
    boardSize: number;
    gridMetrics: BoardGridMetrics;
    positionViewRange: PositionViewRange | null;
};

/**
 * Returns CSS properties for an absolutely-positioned <img> that overlays the
 * stored source image on the board grid, aligning the stored corner points to
 * the corresponding board corner intersections.
 */
export function computeImageOverlayStyle({
    imageSource,
    boardSize,
    gridMetrics,
    positionViewRange,
}: ImageOverlayStyleParams): CSSProperties {
    const { naturalWidth, naturalHeight, corners } = imageSource;
    const { left, top, cellSize } = gridMetrics;

    const startX = positionViewRange?.startX ?? 0;
    const startY = positionViewRange?.startY ?? 0;
    const endX = positionViewRange
        ? positionViewRange.startX + positionViewRange.columns - 1
        : boardSize - 1;
    const endY = positionViewRange
        ? positionViewRange.startY + positionViewRange.rows - 1
        : boardSize - 1;

    // Board corner intersections in gobanWrapperRef-relative space, TL/TR/BR/BL
    const toScreen = (bx: number, by: number): Point => ({
        x: left + (bx - startX + 0.5) * cellSize,
        y: top + (by - startY + 0.5) * cellSize,
    });

    const dst: [Point, Point, Point, Point] = [
        toScreen(startX, startY),
        toScreen(endX, startY),
        toScreen(endX, endY),
        toScreen(startX, endY),
    ];

    // Source corners in natural image pixel space, TL/TR/BR/BL
    const src: [Point, Point, Point, Point] = [
        { x: corners[0].x * naturalWidth, y: corners[0].y * naturalHeight },
        { x: corners[1].x * naturalWidth, y: corners[1].y * naturalHeight },
        { x: corners[2].x * naturalWidth, y: corners[2].y * naturalHeight },
        { x: corners[3].x * naturalWidth, y: corners[3].y * naturalHeight },
    ];

    const matrix = projectiveMatrix(src, dst);

    return {
        position: "absolute",
        left: 0,
        top: 0,
        width: naturalWidth,
        height: naturalHeight,
        transformOrigin: "0 0",
        transform: `matrix3d(${matrix.join(",")})`,
        pointerEvents: "none",
        opacity: 0.6,
    };
}
