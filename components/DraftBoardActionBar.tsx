"use client";

import {
    Circle,
    Eye,
    EyeOff,
    FilePen,
    SquareArrowUpRight,
    Undo2,
    X,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import type { Stone } from "./types";
import type { ActionBarAnchor } from "../lib/actionBarDrag";
import FloatingBoardActionBar, {
    ActionBarDragHandle,
} from "./FloatingBoardActionBar";
import { t } from "../lib/i18n";

type DraftBoardActionBarProps = {
    anchor: ActionBarAnchor;
    canShareDraft?: boolean;
    canUndo?: boolean;
    dragX: number | null;
    hasStoneCorrectionSelection?: boolean;
    mode?: "board" | "variation";
    onClosePlacementZoom?: () => void;
    onExitStoneEditMode?: () => void;
    onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onToggleColor?: () => void;
    onToggleShareMenu: () => void;
    onToggleSourceImage?: () => void;
    onUndo?: () => void;
    railRef: RefObject<HTMLDivElement | null>;
    selectedColor?: Stone;
    shareMenuOpen: boolean;
    shareTriggerRef: RefObject<HTMLButtonElement | null>;
    showPlacementZoomControl?: boolean;
    showSourceImageToggle?: boolean;
    sourceImageVisible?: boolean;
};

export default function DraftBoardActionBar({
    anchor,
    canShareDraft = true,
    canUndo = false,
    dragX,
    hasStoneCorrectionSelection = false,
    mode = "board",
    onClosePlacementZoom,
    onExitStoneEditMode,
    onLostPointerCapture,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onToggleColor,
    onToggleShareMenu,
    onToggleSourceImage,
    onUndo,
    railRef,
    selectedColor = "B",
    shareMenuOpen,
    shareTriggerRef,
    showPlacementZoomControl = false,
    showSourceImageToggle = false,
    sourceImageVisible = false,
}: DraftBoardActionBarProps) {
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
            <div
                className="inline-flex h-11 w-11 items-center justify-center text-zinc-700 dark:text-zinc-200"
                aria-hidden="true"
            >
                <FilePen size={18} />
            </div>
            {mode === "variation" ? (
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
            ) : (
                <>
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
                    {showSourceImageToggle ? (
                        <button
                            type="button"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                            onClick={onToggleSourceImage}
                            aria-label={sourceImageVisible ? t("hideSourceImage") : t("showSourceImage")}
                            title={sourceImageVisible ? t("hideSourceImage") : t("showSourceImage")}
                            aria-pressed={sourceImageVisible}
                        >
                            {sourceImageVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    ) : null}
                </>
            )}
            <button
                type="button"
                ref={shareTriggerRef}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                disabled={!canShareDraft}
                onClick={onToggleShareMenu}
                aria-label={t("details")}
                aria-expanded={shareMenuOpen}
                aria-controls="share-menu"
                title={canShareDraft ? t("details") : t("addMoveBeforeSharing")}
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
