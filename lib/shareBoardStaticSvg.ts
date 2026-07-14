import type { FinalPosition, ShareRecord } from "../components/types";
import { getFinalPositionFromGameState } from "./shareFinalPosition";
import { getPositionViewRange } from "./positionView";
import { getShareBoardPositionView } from "./shareBoardView";
import { createVariationMoveNumberMarkerMap } from "./variationDraft";

// A lightweight, scalable stand-in for the interactive Shudan board rendered on
// the server so the shared board paints as real (LCP) content before the client
// bundle loads. Split by what varies with theme:
//   - background, grid and star points DO change per theme, so they are one
//     inline SVG coloured by CSS (driven by the pre-paint `dark`/`board-wood`
//     classes) — no baked variants, no flash.
//   - stones are identical in every theme, so they are a single baked <img>
//     data URI — a reliable, high-entropy LCP element (inline SVG is not an LCP
//     candidate, and an <img> is opaque to CSS so it can't be themed anyway).
// Geometry mirrors the minimalist Shudan theme (app/goban-overrides.css) so
// swapping in the live board is seamless.

// Vertex units (1 unit == one board vertex; the live board's font-size == vertex
// size, so Shudan's em-based sizes map directly onto these units).
const COORDINATE_GUTTER = 1; // one vertex of coordinate space per side (default on)
const STONE_RADIUS = 0.46; // Shudan stone is the cell minus .08em
const WHITE_STONE_STROKE = 0.03; // approximates Shudan's 1px white-stone border
const LAST_MOVE_RADIUS = 0.22;
const LAST_MOVE_STROKE = 0.08;
const LABEL_FONT_SIZE = 0.56;

export const STATIC_BOARD_GRID_STROKE = 0.03;
export const STATIC_BOARD_HOSHI_RADIUS = 0.12;

// Column coordinate letters skip "I", matching Shudan's default (see
// @sabaki/shudan helper.js).
const COORDINATE_ALPHA = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
const COORDINATE_FONT_SIZE = 0.6; // Shudan renders coordinate labels at .6em.

const BLACK_STONE_FILL = "#09090b";
const WHITE_STONE_FILL = "#fafafa";
const WHITE_STONE_BORDER = "#18181b";
const ON_BLACK = "#fafafa";
const ON_WHITE = "#18181b";

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
    // Offsets of the visible region and full board size, used to label
    // coordinates with their true board positions under a position view.
    startX: number;
    startY: number;
    boardSize: number;
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

    return { columns, rows, startX, startY, boardSize, stones, hoshi };
}

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}

// The viewBox is in vertex units and includes the coordinate gutter, so the
// grid sits where the live board's grid sits and the swap does not shift.
function getViewBox(model: StaticBoardModel) {
    const width = model.columns + COORDINATE_GUTTER * 2;
    const height = model.rows + COORDINATE_GUTTER * 2;
    const first = COORDINATE_GUTTER + 0.5;
    const center = (index: number) => round(first + index);

    return { width, height, first: round(first), center };
}

// Builds the theme-neutral stones layer (stones, last-move marker and variation
// labels) as an SVG string for use as an <img> data URI. Colours here depend on
// the stone, not the board theme, so a single image serves every theme.
function buildStonesSvg(model: StaticBoardModel): string {
    const { width, height, center } = getViewBox(model);

    const shapes = model.stones
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
        shapes +
        `</svg>`
    );
}

export function toSvgDataUri(svg: string): string {
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export type StaticBoardCoordinate = {
    x: number;
    y: number;
    text: string;
};

export const STATIC_BOARD_COORDINATE_FONT_SIZE = COORDINATE_FONT_SIZE;

export type ShareStaticBoard = {
    columns: number;
    rows: number;
    width: number;
    height: number;
    // Combined "M..V.. M..H.." path for every grid line, coloured by CSS.
    gridPath: string;
    hoshi: { cx: number; cy: number }[];
    // Coordinate labels (letters top/bottom, numbers left/right) matching
    // Shudan's convention, coloured by CSS and hidden when the visitor has
    // coordinates turned off.
    coordinates: StaticBoardCoordinate[];
    // Theme-neutral stones as an SVG data URI, used as the LCP <img>.
    stonesSrc: string;
};

export function getShareStaticBoard(share: ShareRecord): ShareStaticBoard {
    const model = getStaticBoardModel(share);
    const { width, height, first, center } = getViewBox(model);
    const lastCol = round(first + (model.columns - 1));
    const lastRow = round(first + (model.rows - 1));

    const gridSegments: string[] = [];
    for (let i = 0; i < model.columns; i += 1) {
        gridSegments.push(`M${center(i)} ${first}V${lastRow}`);
    }
    for (let j = 0; j < model.rows; j += 1) {
        gridSegments.push(`M${first} ${center(j)}H${lastCol}`);
    }

    // Column letters along the top and bottom, row numbers down each side. The
    // centre of a gutter track is half a unit from the board edge.
    const nearGutter = round(COORDINATE_GUTTER / 2);
    const farColumnGutter = round(height - COORDINATE_GUTTER / 2);
    const farRowGutter = round(width - COORDINATE_GUTTER / 2);
    const coordinates: StaticBoardCoordinate[] = [];
    for (let i = 0; i < model.columns; i += 1) {
        const boardColumn = model.startX + i;
        const text =
            COORDINATE_ALPHA[boardColumn] ??
            COORDINATE_ALPHA[COORDINATE_ALPHA.length - 1];
        coordinates.push({ x: center(i), y: nearGutter, text });
        coordinates.push({ x: center(i), y: farColumnGutter, text });
    }
    for (let j = 0; j < model.rows; j += 1) {
        const text = String(model.boardSize - (model.startY + j));
        coordinates.push({ x: nearGutter, y: center(j), text });
        coordinates.push({ x: farRowGutter, y: center(j), text });
    }

    return {
        columns: model.columns,
        rows: model.rows,
        width,
        height,
        gridPath: gridSegments.join(""),
        hoshi: model.hoshi.map(({ col, row }) => ({
            cx: center(col),
            cy: center(row),
        })),
        coordinates,
        stonesSrc: toSvgDataUri(buildStonesSvg(model)),
    };
}
