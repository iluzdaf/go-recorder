"use client";

import {
    Circle,
    FilePen,
    SquareArrowUpRight,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import type { Stone } from "./types";
import type { ActionBarAnchor } from "../lib/actionBarDrag";
import { t } from "../lib/i18n";

type DraftBoardActionBarProps = {
    anchor: ActionBarAnchor;
    dragX: number | null;
    onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onToggleColor: () => void;
    onToggleShareMenu: () => void;
    railRef: RefObject<HTMLDivElement | null>;
    selectedColor: Stone;
    shareMenuOpen: boolean;
    shareTriggerRef: RefObject<HTMLButtonElement | null>;
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

export default function DraftBoardActionBar({
    anchor,
    dragX,
    onLostPointerCapture,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onToggleColor,
    onToggleShareMenu,
    railRef,
    selectedColor,
    shareMenuOpen,
    shareTriggerRef,
}: DraftBoardActionBarProps) {
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
                              : "absolute right-0 top-1/2 -translate-y-1/2"
                    }
                    style={dragX !== null ? { left: `${dragX}px` } : undefined}
                >
                    <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                        <div
                            className="inline-flex h-11 w-11 items-center justify-center text-zinc-700 dark:text-zinc-200"
                            aria-hidden="true"
                        >
                            <FilePen size={18} />
                        </div>
                        <button
                            type="button"
                            className={
                                selectedColor === "B"
                                    ? "inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-950 text-white hover:bg-zinc-800 dark:border-neutral-700 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                    : "inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                            }
                            onClick={onToggleColor}
                            aria-label={t("toggleDraftStoneColor")}
                            title={t("toggleDraftStoneColor")}
                        >
                            <Circle size={18} fill="currentColor" />
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
