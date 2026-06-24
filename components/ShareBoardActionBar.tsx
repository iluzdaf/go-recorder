"use client";

import {
    ChevronLeft,
    ChevronRight,
    SkipBack,
    SkipForward,
    SquareArrowUpRight,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import type { ActionBarAnchor } from "../lib/actionBarDrag";
import FloatingBoardActionBar, {
    ActionBarDragHandle,
} from "./FloatingBoardActionBar";
import { t } from "../lib/i18n";

type ShareBoardActionBarProps = {
    anchor: ActionBarAnchor;
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
    onToggleSgfInfo: () => void;
    onToggleShareMenu: () => void;
    railRef: RefObject<HTMLDivElement | null>;
    sgfInfoOpen: boolean;
    shareMenuOpen: boolean;
    shareTriggerRef: RefObject<HTMLButtonElement | null>;
    totalMoveCount: number;
    visibleMoveCount: number;
};

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
    onToggleSgfInfo,
    onToggleShareMenu,
    railRef,
    sgfInfoOpen,
    shareMenuOpen,
    shareTriggerRef,
    totalMoveCount,
    visibleMoveCount,
}: ShareBoardActionBarProps) {
    const isAtStart = visibleMoveCount === 0;
    const isAtEnd = visibleMoveCount === totalMoveCount;

    return (
        <FloatingBoardActionBar
            anchor={anchor}
            dragX={dragX}
            railRef={railRef}
        >
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
                onClick={onToggleSgfInfo}
                aria-label={t("sgfMetadata")}
                aria-expanded={sgfInfoOpen}
                title={t("sgfMetadata")}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
            >
                {t("sgfMetadata")}
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
            <ActionBarDragHandle
                onLostPointerCapture={onLostPointerCapture}
                onPointerCancel={onPointerCancel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
            />
        </FloatingBoardActionBar>
    );
}
