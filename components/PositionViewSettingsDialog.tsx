"use client";

import {
    ArrowDown,
    ArrowDownLeft,
    ArrowDownRight,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowUpLeft,
    ArrowUpRight,
    CircleDot,
} from "lucide-react";
import type { ChangeEvent, ComponentType, RefObject } from "react";

import type { BoardSize, PositionView, PositionViewAnchor } from "./types";
import { clampPositionView } from "../lib/positionView";
import { t } from "../lib/i18n";

type PositionViewSettingsDialogProps = {
    alignToViewportTop?: boolean;
    boardSize: BoardSize;
    dialogRef?: RefObject<HTMLDivElement | null>;
    onChange: (positionView: PositionView) => void;
    positionView?: PositionView | null;
};

type AnchorIcon = ComponentType<{ size?: number }>;

const REGION_ANCHORS: PositionViewAnchor[] = [
    "top-left",
    "top",
    "top-right",
    "left",
    "center",
    "right",
    "bottom-left",
    "bottom",
    "bottom-right",
];

const ANCHOR_LABELS: Record<PositionViewAnchor, string> = {
    full: "Full board",
    "top-left": "Top left",
    top: "Top",
    "top-right": "Top right",
    left: "Left",
    center: "Center",
    right: "Right",
    "bottom-left": "Bottom left",
    bottom: "Bottom",
    "bottom-right": "Bottom right",
};

const ANCHOR_ICONS: Record<PositionViewAnchor, AnchorIcon> = {
    full: CircleDot,
    "top-left": ArrowUpLeft,
    top: ArrowUp,
    "top-right": ArrowUpRight,
    left: ArrowLeft,
    center: CircleDot,
    right: ArrowRight,
    "bottom-left": ArrowDownLeft,
    bottom: ArrowDown,
    "bottom-right": ArrowDownRight,
};

function getDefaultSettingsPositionView(boardSize: BoardSize): PositionView {
    return {
        anchor: "top-left",
        rows: boardSize,
        columns: boardSize,
    };
}

export default function PositionViewSettingsDialog({
    alignToViewportTop = false,
    boardSize,
    dialogRef,
    onChange,
    positionView,
}: PositionViewSettingsDialogProps) {
    const currentView = clampPositionView(
        positionView ?? getDefaultSettingsPositionView(boardSize),
        boardSize
    );
    const selectedAnchor =
        currentView.anchor === "full" ? "top-left" : currentView.anchor;

    const changePositionView = (nextView: PositionView) => {
        onChange(clampPositionView(nextView, boardSize));
    };

    const handleSizeChange =
        (key: "rows" | "columns") =>
        (event: ChangeEvent<HTMLSelectElement>) => {
            changePositionView({
                ...currentView,
                anchor:
                    currentView.anchor === "full"
                        ? "top-left"
                        : currentView.anchor,
                [key]: Number(event.target.value),
            });
        };

    const sizeOptions = Array.from(
        { length: boardSize - 1 },
        (_, index) => index + 2
    );

    return (
        <div
            aria-labelledby="position-view-settings-title"
            className={
                alignToViewportTop
                    ? "absolute right-4 top-4 z-50 w-[min(42rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-3 text-zinc-950 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    : "fixed right-4 top-16 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-3 text-zinc-950 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            }
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
        >
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2
                    id="position-view-settings-title"
                    className="text-sm font-semibold text-zinc-950 dark:text-white"
                >
                    {t("positionViewSettings")}
                </h2>
            </div>

            <div
                className={
                    alignToViewportTop
                        ? "grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]"
                        : "flex flex-col gap-2"
                }
            >
                <div className="grid grid-cols-3 gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-neutral-700 dark:bg-neutral-950">
                    {REGION_ANCHORS.map((anchor) => {
                        const Icon = ANCHOR_ICONS[anchor];

                        return (
                            <button
                                key={anchor}
                                type="button"
                                className={
                                    selectedAnchor === anchor
                                        ? "inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                                        : "inline-flex h-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                }
                                onClick={() =>
                                    changePositionView({
                                        ...currentView,
                                        anchor,
                                    })
                                }
                                aria-label={ANCHOR_LABELS[anchor]}
                                title={ANCHOR_LABELS[anchor]}
                            >
                                <Icon size={18} />
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {t("rows")}
                        <select
                            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                            value={currentView.rows}
                            onChange={handleSizeChange("rows")}
                        >
                            {sizeOptions.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {t("columns")}
                        <select
                            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                            value={currentView.columns}
                            onChange={handleSizeChange("columns")}
                        >
                            {sizeOptions.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>
        </div>
    );
}
