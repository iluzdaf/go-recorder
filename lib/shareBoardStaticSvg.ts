import type { FinalPosition, ShareRecord } from "../components/types";
import { getFinalPositionFromGameState } from "./shareFinalPosition";
import { getPositionViewRange } from "./positionView";
import { getShareBoardPositionView } from "./shareBoardView";
import { createVariationMoveNumberMarkerMap } from "./variationDraft";

// A lightweight, scalable stand-in for the interactive Shudan board rendered on
// the server so the shared board paints as real (LCP) content before the client
// bundle loads. Colours and geometry mirror the minimalist Shudan theme
// (app/goban-overrides.css) so swapping in the live board is seamless. Emitted
// as an <img> data URI because inline SVG is not a reliable LCP candidate.

// Vertex units (1 unit == one board vertex; the live board's font-size == vertex
// size, so Shudan's em-based sizes map directly onto these units).
const COORDINATE_GUTTER = 1; // one vertex of coordinate space per side (default on)
const STONE_RADIUS = 0.46; // Shudan stone is the cell minus .08em
const WHITE_STONE_STROKE = 0.03; // approximates Shudan's 1px white-stone border
const HOSHI_RADIUS = 0.12;
const GRID_STROKE = 0.03;
const LAST_MOVE_RADIUS = 0.22;
const LAST_MOVE_STROKE = 0.08;
const LABEL_FONT_SIZE = 0.56;

const BLACK_STONE_FILL = "#09090b";
const WHITE_STONE_FILL = "#fafafa";
const WHITE_STONE_BORDER = "#18181b";
const ON_BLACK = "#fafafa";
const ON_WHITE = "#18181b";

export type StaticBoardTheme = {
    boardBackground: string;
    gridLine: string;
    hoshi: string;
};

export const STATIC_BOARD_THEME_LIGHT: StaticBoardTheme = {
    boardBackground: "#f4f4f5",
    gridLine: "#52525b",
    hoshi: "#3f3f46",
};

export const STATIC_BOARD_THEME_DARK: StaticBoardTheme = {
    boardBackground: "#60606a",
    gridLine: "#a1a1aa",
    hoshi: "#d4d4d8",
};

export const STATIC_BOARD_THEME_WOOD_LIGHT: StaticBoardTheme = {
    boardBackground: "#d7a45f",
    gridLine: "#6f4720",
    hoshi: "#3b2818",
};

export const STATIC_BOARD_THEME_WOOD_DARK: StaticBoardTheme = {
    boardBackground: "#7a4f2a",
    gridLine: "#2f2118",
    hoshi: "#1d1712",
};

type StaticBoardStone = {
    col: number;
    row: number;
    sign: 1 | -1;
    label?: string;
    lastMove?: boolean;
};

export type StaticBoardModel = {
    columns: number;
    rows: number;
    stones: StaticBoardStone[];
    hoshi: { col: number; row: number }[];
};

function getStarPoints(boardSize: number): [number, number][] {
    if (boardSize === 19) {
        return [3, 9, 15].flatMap((x) => [3, 9, 15].map((y): [number, number] => [x, y]));
    }
    if (boardSize === 13) {
        return [3, 6, 9].flatMap((x) => [3, 6, 9].map((y): [number, number] => [x, y]));
    }
    return [2, 4, 6].flatMap((x) => [2, 4, 6].map((y): [number, number] => [x, y]));
}

// Derives the theme-independent geometry (visible stones and star points in the
// visible region's local coordinates) for the final position of a share.
export function getStaticBoardModel(share: ShareRecord): StaticBoardModel {
    const boardSize = share.boardSize;
    const positionRange = getPositionViewRange({
        boardSize,
        positionView: getShareBoardPositionView(share),
    });
    const columns = positionRange?.columns ?? boardSize;
    const rows = positionRange?.rows ?? boardSize;
    const startX = positionRange?.startX ?? 0;
    const startY = positionRange?.startY ?? 0;

    const finalPosition: FinalPosition | null =
        share.finalPosition ??
        (() => {
            const result = getFinalPositionFromGameState({
                boardSize,
                gameState: share.gameState,
            });
            return result.ok ? result.finalPosition : null;
        })();

    const labelMap =
        share.draftKind === "variation" &&
        typeof share.baseMoveCount === "number" &&
        finalPosition
            ? createVariationMoveNumberMarkerMap({
                  boardSize,
                  moves: share.gameState.moves,
                  signMap: finalPosition,
                  startMoveIndex: share.baseMoveCount,
              })
            : null;

    const lastPlay =
        share.draftKind !== "variation"
            ? [...share.gameState.moves]
                  .reverse()
                  .find((move) => move.type === "play")
            : undefined;

    const stones: StaticBoardStone[] = [];
    if (finalPosition) {
        for (let y = startY; y < startY + rows; y += 1) {
            for (let x = startX; x < startX + columns; x += 1) {
                const sign = finalPosition[y]?.[x] ?? 0;
                if (sign !== 1 && sign !== -1) continue;

                const label = labelMap?.[y]?.[x]?.label;
                const lastMove =
                    lastPlay?.type === "play" &&
                    lastPlay.x === x &&
                    lastPlay.y === y;

                stones.push({
                    col: x - startX,
                    row: y - startY,
                    sign,
                    ...(label ? { label } : {}),
                    ...(lastMove ? { lastMove: true } : {}),
                });
            }
        }
    }

    const hoshi = getStarPoints(boardSize)
        .filter(
            ([x, y]) =>
                x >= startX &&
                x < startX + columns &&
                y >= startY &&
                y < startY + rows
        )
        .map(([x, y]) => ({ col: x - startX, row: y - startY }));

    return { columns, rows, stones, hoshi };
}

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}

// Builds the SVG markup for a board model in a given theme. viewBox is in vertex
// units and includes the coordinate gutter, so the grid sits where the live
// board's grid sits and the swap does not shift.
export function buildStaticBoardSvg(
    model: StaticBoardModel,
    theme: StaticBoardTheme
): string {
    const { columns, rows, stones, hoshi } = model;
    const width = columns + COORDINATE_GUTTER * 2;
    const height = rows + COORDINATE_GUTTER * 2;
    const first = COORDINATE_GUTTER + 0.5;
    const lastCol = first + (columns - 1);
    const lastRow = first + (rows - 1);
    const center = (index: number) => round(first + index);

    const gridLines: string[] = [];
    for (let i = 0; i < columns; i += 1) {
        const x = center(i);
        gridLines.push(`M${x} ${round(first)}V${round(lastRow)}`);
    }
    for (let j = 0; j < rows; j += 1) {
        const y = center(j);
        gridLines.push(`M${round(first)} ${y}H${round(lastCol)}`);
    }

    const hoshiCircles = hoshi
        .map(
            ({ col, row }) =>
                `<circle cx="${center(col)}" cy="${center(row)}" r="${HOSHI_RADIUS}" fill="${theme.hoshi}"/>`
        )
        .join("");

    const stoneShapes = stones
        .map((stone) => {
            const cx = center(stone.col);
            const cy = center(stone.row);
            const isBlack = stone.sign === 1;
            const fill = isBlack ? BLACK_STONE_FILL : WHITE_STONE_FILL;
            const border = isBlack
                ? ""
                : ` stroke="${WHITE_STONE_BORDER}" stroke-width="${WHITE_STONE_STROKE}"`;
            const parts = [
                `<circle cx="${cx}" cy="${cy}" r="${STONE_RADIUS}" fill="${fill}"${border}/>`,
            ];

            const contrast = isBlack ? ON_BLACK : ON_WHITE;
            if (stone.label) {
                parts.push(
                    `<text x="${cx}" y="${cy}" font-family="sans-serif" font-size="${LABEL_FONT_SIZE}" font-weight="700" fill="${contrast}" text-anchor="middle" dominant-baseline="central">${stone.label}</text>`
                );
            } else if (stone.lastMove) {
                parts.push(
                    `<circle cx="${cx}" cy="${cy}" r="${LAST_MOVE_RADIUS}" fill="none" stroke="${contrast}" stroke-width="${LAST_MOVE_STROKE}"/>`
                );
            }
            return parts.join("");
        })
        .join("");

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">` +
        `<rect width="${width}" height="${height}" fill="${theme.boardBackground}"/>` +
        `<path d="${gridLines.join("")}" stroke="${theme.gridLine}" stroke-width="${GRID_STROKE}" fill="none"/>` +
        hoshiCircles +
        stoneShapes +
        `</svg>`
    );
}

export function toSvgDataUri(svg: string): string {
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// One variant per (mode, board theme) combination. The server cannot know the
// visitor's mode or board theme (both live in localStorage), so it emits all
// four and the pre-paint theme script's `dark`/`board-wood` classes on <html>
// let CSS reveal the matching one; only the visible variant is painted.
export type StaticBoardVariantKey =
    | "light-minimalist"
    | "light-wood"
    | "dark-minimalist"
    | "dark-wood";

export type StaticBoardVariant = {
    key: StaticBoardVariantKey;
    src: string;
};

export type StaticBoardImages = {
    columns: number;
    rows: number;
    variants: StaticBoardVariant[];
};

const STATIC_BOARD_VARIANTS: { key: StaticBoardVariantKey; theme: StaticBoardTheme }[] = [
    { key: "light-minimalist", theme: STATIC_BOARD_THEME_LIGHT },
    { key: "light-wood", theme: STATIC_BOARD_THEME_WOOD_LIGHT },
    { key: "dark-minimalist", theme: STATIC_BOARD_THEME_DARK },
    { key: "dark-wood", theme: STATIC_BOARD_THEME_WOOD_DARK },
];

export function getShareStaticBoardImages(share: ShareRecord): StaticBoardImages {
    const model = getStaticBoardModel(share);

    return {
        columns: model.columns,
        rows: model.rows,
        variants: STATIC_BOARD_VARIANTS.map((variant) => ({
            key: variant.key,
            src: toSvgDataUri(buildStaticBoardSvg(model, variant.theme)),
        })),
    };
}
