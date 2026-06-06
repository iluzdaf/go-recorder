"use client";

import {
    ChevronLeft,
    ChevronRight,
    FileText,
    SkipBack,
    SkipForward,
    SquareArrowUpRight,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { t } from "../lib/i18n";

export type ShareBoardActionBarAnchor = "left" | "center" | "right";

type ShareBoardActionBarProps = {
    anchor: ShareBoardActionBarAnchor;
    dragX: number | null;
    onJumpToEnd: () => void;
    onJumpToStart: () => void;
    onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onNextMove: () => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPreviousMove: () => void;
    onToggleShareMenu: () => void;
    railRef: RefObject<HTMLDivElement | null>;
    shareMenuOpen: boolean;
    shareTriggerRef: RefObject<HTMLButtonElement | null>;
    totalMoveCount: number;
    visibleMoveCount: number;
};

function DragHandleDots() {
    return (
        <span
            aria-hidden="true"
            className="grid h-6 w-4 grid-cols-2 gap-x-1 gap-y-1"
        >
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
        </span>
    );
}

export default function ShareBoardActionBar({
    anchor,
    dragX,
    onJumpToEnd,
    onJumpToStart,
    onLostPointerCapture,
    onNextMove,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPreviousMove,
    onToggleShareMenu,
    railRef,
    shareMenuOpen,
    shareTriggerRef,
    totalMoveCount,
    visibleMoveCount,
}: ShareBoardActionBarProps) {
    const isAtStart = visibleMoveCount === 0;
    const isAtEnd = visibleMoveCount === totalMoveCount;

    return (
        <div
            ref={railRef}
            className="absolute inset-x-3 bottom-3 z-40 h-14 select-none sm:bottom-4"
        >
            <div className="relative h-full w-full">
                <div
                    className={
                        dragX !== null
                            ? "absolute top-1/2 -translate-y-1/2"
                            : anchor === "left"
                              ? "absolute left-0 top-1/2 -translate-y-1/2"
                              : anchor === "right"
                                ? "absolute right-0 top-1/2 -translate-y-1/2"
                                : "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    }
                    style={dragX !== null ? { left: `${dragX}px` } : undefined}
                >
                    <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                        <div
                            className="inline-flex h-11 w-11 items-center justify-center text-zinc-700 dark:text-zinc-200"
                            aria-hidden="true"
                        >
                            <FileText size={18} />
                        </div>
                        <button
                            type="button"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                            onClick={onJumpToStart}
                            aria-label="Go to start"
                            title="Go to start"
                            disabled={isAtStart}
                        >
                            <SkipBack size={18} />
                        </button>
                        <button
                            type="button"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                            onClick={onPreviousMove}
                            aria-label="Previous move"
                            title="Previous move"
                            disabled={isAtStart}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            type="button"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                            onClick={onNextMove}
                            aria-label="Next move"
                            title="Next move"
                            disabled={isAtEnd}
                        >
                            <ChevronRight size={18} />
                        </button>
                        <button
                            type="button"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                            onClick={onJumpToEnd}
                            aria-label="Go to end"
                            title="Go to end"
                            disabled={isAtEnd}
                        >
                            <SkipForward size={18} />
                        </button>
                        <button
                            type="button"
                            ref={shareTriggerRef}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                            onClick={onToggleShareMenu}
                            aria-label={t("share")}
                            aria-expanded={shareMenuOpen}
                            aria-controls="share-menu"
                            title={t("share")}
                        >
                            <SquareArrowUpRight size={18} />
                        </button>
                        <div
                            className="flex h-11 w-10 cursor-grab items-center justify-center active:cursor-grabbing"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerCancel}
                            onLostPointerCapture={onLostPointerCapture}
                        >
                            <DragHandleDots />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
