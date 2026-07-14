"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import type { ShareRecord } from "./types";
import { useBoardDisplaySettings } from "./AppShell";
import { getPositionViewRange } from "../lib/positionView";
import { getShareBoardPlaceholderSize } from "../lib/shareBoardPlaceholder";
import {
    STATIC_BOARD_COORDINATE_FONT_SIZE,
    STATIC_BOARD_GRID_STROKE,
    STATIC_BOARD_HOSHI_RADIUS,
    getShareStaticBoard,
} from "../lib/shareBoardStaticSvg";
import { getShareBoardPositionView } from "../lib/shareBoardView";

type ShareBoardLoaderProps = {
    share: ShareRecord;
};

const ShareBoard = dynamic(() => import("@/components/ShareGoBoard"), {
    ssr: false,
});

// Server-rendered so the shared board paints as real (LCP) content before the
// client bundle loads, sized to the real board so swapping in the live board
// causes no layout shift. The background/grid/star points are one inline SVG
// coloured by CSS via the pre-paint `dark`/`board-wood` classes (no flash, no
// baked variants); the theme-neutral stones are a single <img> (the LCP
// element). The action bar is intentionally not rendered here: the live,
// interactive bar arrives with the client board.
export function ShareBoardLoadingShell({ share }: { share: ShareRecord }) {
    const { showBoardCoordinates } = useBoardDisplaySettings();
    const positionRange = getPositionViewRange({
        boardSize: share.boardSize,
        positionView: getShareBoardPositionView(share),
    });
    const placeholderSize = getShareBoardPlaceholderSize({
        columns: positionRange?.columns ?? share.boardSize,
        rows: positionRange?.rows ?? share.boardSize,
        showCoordinates: showBoardCoordinates,
    });
    const board = getShareStaticBoard(share);
    const viewBox = `0 0 ${board.width} ${board.height}`;

    return (
        <div className="relative m-0 flex min-h-0 flex-1 touch-none flex-col overflow-hidden overscroll-none bg-zinc-100 p-0 text-zinc-950 dark:bg-neutral-900 dark:text-white">
            <div className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden overscroll-none p-0">
                <div
                    role="status"
                    aria-live="polite"
                    style={{
                        width: placeholderSize.width,
                        height: placeholderSize.height,
                    }}
                    className="relative"
                >
                    <span className="sr-only">Loading shared board</span>
                    <svg
                        className="absolute inset-0 h-full w-full"
                        viewBox={viewBox}
                        preserveAspectRatio="xMidYMid meet"
                        aria-hidden="true"
                    >
                        <rect
                            className="share-static-board-bg"
                            width={board.width}
                            height={board.height}
                        />
                        <path
                            className="share-static-board-grid"
                            d={board.gridPath}
                            fill="none"
                            strokeWidth={STATIC_BOARD_GRID_STROKE}
                        />
                        {board.hoshi.map((point, index) => (
                            <circle
                                key={index}
                                className="share-static-board-hoshi"
                                cx={point.cx}
                                cy={point.cy}
                                r={STATIC_BOARD_HOSHI_RADIUS}
                            />
                        ))}
                        {board.coordinates.map((coordinate, index) => (
                            <text
                                key={index}
                                className="share-static-board-coord"
                                x={coordinate.x}
                                y={coordinate.y}
                                fontSize={STATIC_BOARD_COORDINATE_FONT_SIZE}
                                textAnchor="middle"
                                dominantBaseline="central"
                            >
                                {coordinate.text}
                            </text>
                        ))}
                    </svg>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={board.stonesSrc}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="absolute inset-0 h-full w-full select-none"
                    />
                </div>
            </div>
        </div>
    );
}

export default function ShareBoardLoader({ share }: ShareBoardLoaderProps) {
    const [boardReady, setBoardReady] = useState(false);
    const handleBoardReady = useCallback(() => setBoardReady(true), []);

    useEffect(() => {
        performance.mark("share-board-loader-mounted");
    }, []);

    return (
        <div className="relative flex min-h-0 flex-1 flex-col">
            <ShareBoard share={share} onReady={handleBoardReady} />
            {boardReady ? null : (
                <div className="absolute inset-0 z-30 flex flex-col">
                    <ShareBoardLoadingShell share={share} />
                </div>
            )}
        </div>
    );
}
