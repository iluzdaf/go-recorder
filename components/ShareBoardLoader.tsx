"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
    ChevronLeft,
    ChevronRight,
    SkipBack,
    SkipForward,
    SquareArrowUpRight,
} from "lucide-react";

import type { ShareRecord } from "./types";
import { useBoardDisplaySettings } from "./AppShell";
import { getPositionViewRange } from "../lib/positionView";
import { getShareBoardPlaceholderSize } from "../lib/shareBoardPlaceholder";
import { getShareStaticBoardImages } from "../lib/shareBoardStaticSvg";
import { getShareBoardPositionView } from "../lib/shareBoardView";
import { t } from "../lib/i18n";

type ShareBoardLoaderProps = {
    share: ShareRecord;
};

const ShareBoard = dynamic(() => import("@/components/ShareGoBoard"), {
    ssr: false,
});

function DisabledRoundButton({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            aria-label={label}
            title={label}
            disabled
        >
            {children}
        </button>
    );
}

// Server-rendered so first paint shows the board footprint immediately, and
// sized to the real board so swapping in the measured board causes no layout
// shift. Uses dark: variants (keyed off the pre-paint theme class) rather than
// JS theme state so it renders correctly during SSR without a light-mode flash.
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
    const staticBoard = getShareStaticBoardImages(share);

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
                    {/* Server-rendered final position so the board paints as real
                        (LCP) content before hydration. The correct theme is chosen
                        by the .dark class set pre-paint, so only one image paints.
                        Inline data-URI SVGs on purpose: next/image cannot optimise
                        a data URI and its loader would delay the paint we want. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={staticBoard.lightSrc}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="block h-full w-full select-none dark:hidden"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={staticBoard.darkSrc}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="hidden h-full w-full select-none dark:block"
                    />
                </div>
                <div
                    className="pointer-events-none absolute inset-x-3 z-40 h-14 select-none"
                    style={{
                        bottom: "calc(0.75rem + env(safe-area-inset-bottom))",
                    }}
                    aria-label="Share board controls loading"
                >
                    <div className="relative h-full w-full">
                        <div className="pointer-events-auto absolute right-0 top-1/2 -translate-y-1/2">
                            <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                                <DisabledRoundButton label="Go to start">
                                    <SkipBack size={18} />
                                </DisabledRoundButton>
                                <DisabledRoundButton label="Previous move">
                                    <ChevronLeft size={18} />
                                </DisabledRoundButton>
                                <DisabledRoundButton label="Next move">
                                    <ChevronRight size={18} />
                                </DisabledRoundButton>
                                <DisabledRoundButton label="Go to end">
                                    <SkipForward size={18} />
                                </DisabledRoundButton>
                                <DisabledRoundButton label={t("details")}>
                                    <SquareArrowUpRight size={18} />
                                </DisabledRoundButton>
                            </div>
                        </div>
                    </div>
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
                <div className="absolute inset-0 z-30">
                    <ShareBoardLoadingShell share={share} />
                </div>
            )}
        </div>
    );
}
