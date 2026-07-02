"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import type { ReactNode } from "react";
import {
    ChevronLeft,
    ChevronRight,
    SkipBack,
    SkipForward,
    SquareArrowUpRight,
} from "lucide-react";

import type { ShareRecord } from "./types";
import {
    getBoardSurfaceClassName,
    useBoardDisplaySettings,
    useTheme,
} from "./AppShell";
import { t } from "../lib/i18n";

type ShareBoardLoaderProps = {
    share: ShareRecord;
};

const ShareBoard = dynamic(() => import("@/components/ShareGoBoard"), {
    loading: LoadingShareBoard,
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

export function ShareBoardLoadingShell() {
    const { isDarkMode } = useTheme();
    const { activeBoardThemeClassName } = useBoardDisplaySettings();

    return (
        <div
            className={getBoardSurfaceClassName({
                activeBoardThemeClassName,
                isDarkMode,
            })}
        >
            <div className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden overscroll-none p-0">
                <div
                    role="status"
                    aria-live="polite"
                    className="flex aspect-square w-[min(82vmin,calc(100vw-2rem))] max-w-[42rem] items-center justify-center border border-zinc-200 bg-white/70 text-sm font-medium text-zinc-600 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-300"
                >
                    Loading shared board
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

function LoadingShareBoard() {
    return <ShareBoardLoadingShell />;
}

export default function ShareBoardLoader({
    share,
}: ShareBoardLoaderProps) {
    useEffect(() => {
        performance.mark("share-board-loader-mounted");
    }, []);

    return <ShareBoard share={share} />;
}
