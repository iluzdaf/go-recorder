import { memo } from "react";
import type { LocalDraftRecord, LocalGameRecord } from "@/lib/localGames";
import { getFinalPositionFromGameState } from "@/lib/shareFinalPosition";
import { getPositionViewRange } from "@/lib/positionView";
import { createVariationMoveNumberMarkerMap } from "@/lib/variationDraft";
import type { DraftKind, PositionView } from "@/components/types";
import { t } from "@/lib/i18n";

type BoardPreviewRecord = {
    boardSize: LocalGameRecord["boardSize"];
    gameState: LocalGameRecord["gameState"];
    positionView?: PositionView | null;
    draftKind?: DraftKind | null;
    baseMoveCount?: number | null;
};

const THUMB_SIZE = 160;
const THUMB_PAD = 6;

function getStarPoints(boardSize: number): [number, number][] {
    if (boardSize === 19) {
        return [3, 9, 15].flatMap((x) =>
            [3, 9, 15].map<[number, number]>((y) => [x, y])
        );
    }
    if (boardSize === 13) {
        return [3, 6, 9].flatMap((x) =>
            [3, 6, 9].map<[number, number]>((y) => [x, y])
        );
    }
    return [2, 4, 6].flatMap((x) =>
        [2, 4, 6].map<[number, number]>((y) => [x, y])
    );
}

export function getDraftTitle(draft: LocalDraftRecord) {
    if (draft.draftKind === "variation") return t("variation");

    const black = draft.blackPlayerName?.trim();
    const white = draft.whitePlayerName?.trim();

    if (black && white) return `${black} vs ${white}`;
    if (black) return black;
    if (white) return white;

    return t("draft");
}

export function getGameTitle(game: LocalGameRecord) {
    const black = game.blackPlayerName?.trim();
    const white = game.whitePlayerName?.trim();

    if (black && white) return `${black} vs ${white}`;
    if (black) return black;
    if (white) return white;

    return t("unnamedGame");
}

export const GameBoardThumbnail = memo(function GameBoardThumbnail({
    game,
}: {
    game: BoardPreviewRecord;
}) {
    const n = game.boardSize;
    const gridSize = THUMB_SIZE - THUMB_PAD * 2;

    const range = getPositionViewRange({
        boardSize: n,
        positionView: game.positionView,
    });
    const visibleRows = range?.rows ?? n;
    const visibleColumns = range?.columns ?? n;
    const startX = range?.startX ?? 0;
    const startY = range?.startY ?? 0;

    const step = Math.min(
        gridSize / (visibleColumns - 1),
        gridSize / (visibleRows - 1)
    );
    const renderedWidth = (visibleColumns - 1) * step;
    const renderedHeight = (visibleRows - 1) * step;
    const ox = THUMB_PAD + (gridSize - renderedWidth) / 2;
    const oy = THUMB_PAD + (gridSize - renderedHeight) / 2;
    const stoneR = Math.max(2, step * 0.44);
    const fontSize = Math.max(6, stoneR * 0.95);

    const result = getFinalPositionFromGameState({
        boardSize: n,
        gameState: game.gameState,
    });
    const signMap = result.ok ? result.finalPosition : null;

    const markerMap =
        game.draftKind === "variation" &&
        typeof game.baseMoveCount === "number" &&
        signMap
            ? createVariationMoveNumberMarkerMap({
                  boardSize: n,
                  moves: game.gameState.moves,
                  signMap,
                  startMoveIndex: game.baseMoveCount,
              })
            : null;

    return (
        <svg
            width={THUMB_SIZE}
            height={THUMB_SIZE}
            className="shrink-0 rounded"
            aria-hidden
        >
            <rect
                width={THUMB_SIZE}
                height={THUMB_SIZE}
                className="fill-zinc-200 dark:fill-neutral-700"
                rx={4}
            />
            {Array.from({ length: visibleRows }, (_, i) => (
                <line
                    key={`h${i}`}
                    x1={ox}
                    y1={oy + i * step}
                    x2={ox + renderedWidth}
                    y2={oy + i * step}
                    className="stroke-zinc-500 dark:stroke-zinc-400"
                    strokeWidth={0.5}
                />
            ))}
            {Array.from({ length: visibleColumns }, (_, i) => (
                <line
                    key={`v${i}`}
                    x1={ox + i * step}
                    y1={oy}
                    x2={ox + i * step}
                    y2={oy + renderedHeight}
                    className="stroke-zinc-500 dark:stroke-zinc-400"
                    strokeWidth={0.5}
                />
            ))}
            {getStarPoints(n).map(([x, y]) => {
                if (x < startX || x >= startX + visibleColumns) return null;
                if (y < startY || y >= startY + visibleRows) return null;
                return (
                    <circle
                        key={`star-${x}-${y}`}
                        cx={ox + (x - startX) * step}
                        cy={oy + (y - startY) * step}
                        r={1.5}
                        className="fill-zinc-500 dark:fill-zinc-400"
                    />
                );
            })}
            {signMap?.flatMap((row, y) =>
                row.map((sign, x) => {
                    if (sign === 0) return null;
                    if (x < startX || x >= startX + visibleColumns) return null;
                    if (y < startY || y >= startY + visibleRows) return null;
                    const isBlack = sign === 1;
                    const cx = ox + (x - startX) * step;
                    const cy = oy + (y - startY) * step;
                    const marker = markerMap?.[y]?.[x] ?? null;
                    return (
                        <g key={`s-${x}-${y}`}>
                            <circle
                                cx={cx}
                                cy={cy}
                                r={stoneR}
                                className={
                                    isBlack
                                        ? "fill-zinc-900 dark:fill-zinc-950"
                                        : "fill-white stroke-zinc-800 dark:stroke-zinc-300"
                                }
                                strokeWidth={isBlack ? 0 : 0.7}
                            />
                            {marker && (
                                <text
                                    x={cx}
                                    y={cy}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize={fontSize}
                                    fontWeight={800}
                                    fill={isBlack ? "white" : "#18181b"}
                                    className="select-none"
                                >
                                    {marker.label}
                                </text>
                            )}
                        </g>
                    );
                })
            )}
        </svg>
    );
});
