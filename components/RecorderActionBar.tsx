"use client";

import {
    Hand,
    SquareArrowUpRight,
    Undo2,
    X,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import type { ActionBarAnchor } from "../lib/actionBarDrag";
import FloatingBoardActionBar, {
    ActionBarDragHandle,
} from "./FloatingBoardActionBar";
import { t } from "../lib/i18n";

type RecorderActionBarProps = {
    anchor: ActionBarAnchor;
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
    onTogglePanel: () => void;
    onUndo: () => void;
    panelOpen: boolean;
    railRef: RefObject<HTMLDivElement | null>;
    shareTriggerRef: RefObject<HTMLButtonElement | null>;
    showPlacementZoomControl: boolean;
};

export default function RecorderActionBar({
    anchor,
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
    onTogglePanel,
    onUndo,
    panelOpen,
    railRef,
    shareTriggerRef,
    showPlacementZoomControl,
}: RecorderActionBarProps) {
    const overlay =
        showPlacementZoomControl || hasStoneCorrectionSelection ? (
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
        ) : null;

    return (
        <FloatingBoardActionBar
            anchor={anchor}
            dragX={dragX}
            overlay={overlay}
            railRef={railRef}
        >
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
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                onClick={onTogglePanel}
                aria-label={t("details")}
                aria-expanded={panelOpen}
                aria-controls="share-menu"
                title={t("details")}
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
