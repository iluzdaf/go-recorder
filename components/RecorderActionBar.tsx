"use client";

import {
    CircleDot,
    Hand,
    SquareArrowUpRight,
    Undo2,
    X,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { t } from "../lib/i18n";

export type ActionBarAnchor = "left" | "right";

type RecorderActionBarProps = {
    anchor: ActionBarAnchor;
    canShareGame: boolean;
    canUndo: boolean;
    dragX: number | null;
    hasStoneCorrectionSelection: boolean;
    onClosePlacementZoom: () => void;
    onExitStoneEditMode: () => void;
    onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPass: () => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onToggleShareMenu: () => void;
    onUndo: () => void;
    railRef: RefObject<HTMLDivElement | null>;
    shareMenuOpen: boolean;
    shareTriggerRef: RefObject<HTMLButtonElement | null>;
    showPlacementZoomControl: boolean;
};

function DragHandleDots({ className }: { className: string }) {
    return (
        <span aria-hidden="true" className={className}>
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
        </span>
    );
}

export default function RecorderActionBar({
    anchor,
    canShareGame,
    canUndo,
    dragX,
    hasStoneCorrectionSelection,
    onClosePlacementZoom,
    onExitStoneEditMode,
    onLostPointerCapture,
    onPass,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onToggleShareMenu,
    onUndo,
    railRef,
    shareMenuOpen,
    shareTriggerRef,
    showPlacementZoomControl,
}: RecorderActionBarProps) {
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
                    {showPlacementZoomControl || hasStoneCorrectionSelection ? (
                        <div className="absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 items-center gap-2">
                            {showPlacementZoomControl ? (
                                <button
                                    type="button"
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 shadow-lg hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                    onClick={onClosePlacementZoom}
                                    aria-label={t("closeBoardZoom")}
                                    title={t("closeBoardZoom")}
                                >
                                    <X size={18} />
                                    <span>{t("closeBoardZoom")}</span>
                                </button>
                            ) : null}
                            {hasStoneCorrectionSelection ? (
                                <button
                                    type="button"
                                    className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 shadow-lg hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                    onClick={onExitStoneEditMode}
                                    aria-label={t("exitStoneCorrectionMode")}
                                    title={t("exitStoneCorrectionMode")}
                                >
                                    <X size={18} />
                                    <span>{t("exitStoneCorrectionMode")}</span>
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                        <div
                            className="inline-flex h-11 w-11 items-center justify-center text-zinc-700 dark:text-zinc-200"
                            aria-hidden="true"
                        >
                            <CircleDot size={18} />
                        </div>
                        <button
                            type="button"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                            disabled={!canUndo}
                            onClick={onUndo}
                            aria-label={t("undo")}
                            title={t("undo")}
                        >
                            <Undo2 size={18} />
                        </button>
                        <button
                            type="button"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                            onClick={onPass}
                            aria-label={t("pass")}
                            title={t("pass")}
                        >
                            <Hand size={18} />
                        </button>
                        <button
                            type="button"
                            ref={shareTriggerRef}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                            disabled={!canShareGame}
                            onClick={onToggleShareMenu}
                            aria-label={t("share")}
                            aria-expanded={shareMenuOpen}
                            aria-controls="share-menu"
                            title={
                                canShareGame
                                    ? t("share")
                                    : t("addMoveBeforeSharing")
                            }
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
                            <DragHandleDots className="grid h-6 w-4 grid-cols-2 gap-x-1 gap-y-1" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
