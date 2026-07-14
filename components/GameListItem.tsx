import { memo } from "react";
import type { LocalDraftRecord, LocalGameRecord } from "@/lib/localGames";
import { getBoardPreviewModel } from "@/lib/boardPreview";
import type { DraftKind, PositionView } from "@/components/types";
import { t } from "@/lib/i18n";

type BoardPreviewRecord = {
    boardSize: LocalGameRecord["boardSize"];
    gameState: LocalGameRecord["gameState"];
    positionView?: PositionView | null;
    draftKind?: DraftKind | null;
    baseMoveCount?: number | null;
};

const DEFAULT_THUMB_SIZE = 160;

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
    size = DEFAULT_THUMB_SIZE,
}: {
    game: BoardPreviewRecord;
    size?: number;
}) {
    const n = game.boardSize;
    const thumbPad = Math.max(4, Math.round(size * 0.04));
    const gridSize = size - thumbPad * 2;

    const { visibleColumns, visibleRows, startX, startY, stones, starPoints } =
        getBoardPreviewModel({
            boardSize: n,
            gameState: game.gameState,
            positionView: game.positionView,
            draftKind: game.draftKind,
            baseMoveCount: game.baseMoveCount,
        });

    const step = Math.min(
        gridSize / (visibleColumns - 1),
        gridSize / (visibleRows - 1)
    );
    const renderedWidth = (visibleColumns - 1) * step;
    const renderedHeight = (visibleRows - 1) * step;
    const ox = thumbPad + (gridSize - renderedWidth) / 2;
    const oy = thumbPad + (gridSize - renderedHeight) / 2;
    const stoneR = Math.max(2, step * 0.44);
    const fontSize = Math.max(6, stoneR * 0.95);

    return (
        <svg
            width={size}
            height={size}
            className="shrink-0 rounded"
            aria-hidden
        >
            <rect
                width={size}
                height={size}
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
            {starPoints.map(({ x, y }) => (
                <circle
                    key={`star-${x}-${y}`}
                    cx={ox + (x - startX) * step}
                    cy={oy + (y - startY) * step}
                    r={1.5}
                    className="fill-zinc-500 dark:fill-zinc-400"
                />
            ))}
            {stones.map((stone) => {
                const isBlack = stone.sign === 1;
                const cx = ox + (stone.x - startX) * step;
                const cy = oy + (stone.y - startY) * step;
                return (
                    <g key={`s-${stone.x}-${stone.y}`}>
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
                        {stone.label && (
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
                                {stone.label}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
});
