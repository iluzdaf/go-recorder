import type {
    BoardSize,
    DraftKind,
    FinalPosition,
    GameState,
    PositionView,
} from "../components/types";
import { getFinalPositionFromGameState } from "./shareFinalPosition";
import { getPositionViewRange } from "./positionView";
import { createVariationMoveNumberMarkerMap } from "./variationDraft";

// Shared derivation for the non-interactive board previews (home/list
// thumbnails, the share OpenGraph image and the shared board's SSR view). Each
// of those renders very differently, but they all derive the same data from a
// record: the visible window under a position view, the on-board stones in that
// window (with variation move-number labels and the last move flagged), and the
// visible star points. Only this data layer is shared; pixel/viewBox maths and
// colours stay in each renderer.

export function getStarPoints(boardSize: number): [number, number][] {
    if (boardSize === 19) {
        return [3, 9, 15].flatMap((x) =>
            [3, 9, 15].map((y): [number, number] => [x, y])
        );
    }
    if (boardSize === 13) {
        return [3, 6, 9].flatMap((x) =>
            [3, 6, 9].map((y): [number, number] => [x, y])
        );
    }
    return [2, 4, 6].flatMap((x) =>
        [2, 4, 6].map((y): [number, number] => [x, y])
    );
}

export type BoardPreviewStone = {
    // Board coordinates (not offset by the visible window).
    x: number;
    y: number;
    sign: 1 | -1;
    // Variation move number, when this preview is a variation draft.
    label?: string;
    // The final move, flagged for renderers that mark it (only the SSR board
    // does today); ignored by the thumbnail and OpenGraph previews.
    lastMove?: boolean;
};

export type BoardPreviewModel = {
    boardSize: number;
    startX: number;
    startY: number;
    visibleColumns: number;
    visibleRows: number;
    stones: BoardPreviewStone[];
    starPoints: { x: number; y: number }[];
};

export type BoardPreviewInput = {
    boardSize: BoardSize;
    gameState: GameState;
    // A saved final position is preferred when present (OpenGraph); otherwise it
    // is replayed. Callers resolve the position view themselves (shares gate it
    // on the source kind) and pass the result here.
    finalPosition?: FinalPosition | null;
    positionView?: PositionView | null;
    draftKind?: DraftKind | null;
    baseMoveCount?: number | null;
};

export function getBoardPreviewModel(
    input: BoardPreviewInput
): BoardPreviewModel {
    const { boardSize, gameState, positionView, draftKind, baseMoveCount } =
        input;

    const range = getPositionViewRange({ boardSize, positionView });
    const visibleColumns = range?.columns ?? boardSize;
    const visibleRows = range?.rows ?? boardSize;
    const startX = range?.startX ?? 0;
    const startY = range?.startY ?? 0;

    const finalPosition: FinalPosition | null =
        input.finalPosition ??
        (() => {
            const result = getFinalPositionFromGameState({ boardSize, gameState });
            return result.ok ? result.finalPosition : null;
        })();

    const labelMap =
        draftKind === "variation" &&
        typeof baseMoveCount === "number" &&
        finalPosition
            ? createVariationMoveNumberMarkerMap({
                  boardSize,
                  moves: gameState.moves,
                  signMap: finalPosition,
                  startMoveIndex: baseMoveCount,
              })
            : null;

    const lastPlay =
        draftKind !== "variation"
            ? [...gameState.moves].reverse().find((move) => move.type === "play")
            : undefined;

    const stones: BoardPreviewStone[] = [];
    if (finalPosition) {
        for (let y = startY; y < startY + visibleRows; y += 1) {
            for (let x = startX; x < startX + visibleColumns; x += 1) {
                const sign = finalPosition[y]?.[x] ?? 0;
                if (sign !== 1 && sign !== -1) continue;

                const label = labelMap?.[y]?.[x]?.label;
                const lastMove =
                    lastPlay?.type === "play" &&
                    lastPlay.x === x &&
                    lastPlay.y === y;

                stones.push({
                    x,
                    y,
                    sign,
                    ...(label ? { label } : {}),
                    ...(lastMove ? { lastMove: true } : {}),
                });
            }
        }
    }

    const starPoints = getStarPoints(boardSize)
        .filter(
            ([x, y]) =>
                x >= startX &&
                x < startX + visibleColumns &&
                y >= startY &&
                y < startY + visibleRows
        )
        .map(([x, y]) => ({ x, y }));

    return {
        boardSize,
        startX,
        startY,
        visibleColumns,
        visibleRows,
        stones,
        starPoints,
    };
}
