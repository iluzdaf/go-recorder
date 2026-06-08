"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";

import type { BoardSize, PositionView, PositionViewAnchor } from "./types";
import {
    clampPositionView,
    getDefaultPositionView,
} from "../lib/positionView";
import { t } from "../lib/i18n";

type PositionViewSettingsDialogProps = {
    boardSize: BoardSize;
    onApply: (positionView: PositionView) => void;
    onClose: () => void;
    positionView?: PositionView | null;
};

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

const ANCHOR_SHORT_LABELS: Record<PositionViewAnchor, string> = {
    full: "Full",
    "top-left": "TL",
    top: "T",
    "top-right": "TR",
    left: "L",
    center: "C",
    right: "R",
    "bottom-left": "BL",
    bottom: "B",
    "bottom-right": "BR",
};

export default function PositionViewSettingsDialog({
    boardSize,
    onApply,
    onClose,
    positionView,
}: PositionViewSettingsDialogProps) {
    const [draftView, setDraftView] = useState<PositionView>(() =>
        clampPositionView(positionView ?? getDefaultPositionView(boardSize), boardSize)
    );

    const updateDraftView = (nextView: PositionView) => {
        setDraftView(clampPositionView(nextView, boardSize));
    };

    const handleNumberChange =
        (key: "rows" | "columns") =>
        (event: ChangeEvent<HTMLInputElement>) => {
            updateDraftView({
                ...draftView,
                anchor: draftView.anchor === "full" ? "center" : draftView.anchor,
                [key]: Number(event.target.value),
            });
        };

    return (
        <div
            aria-labelledby="position-view-settings-title"
            className="fixed right-4 top-16 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-3 text-zinc-950 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
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
                <button
                    type="button"
                    className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                    onClick={onClose}
                    aria-label={t("cancel")}
                >
                    {t("cancel")}
                </button>
            </div>

            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    className={
                        draftView.anchor === "full"
                            ? "inline-flex h-11 w-full items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
                            : "inline-flex h-11 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                    }
                    onClick={() => updateDraftView(getDefaultPositionView(boardSize))}
                >
                    {t("fullBoard")}
                </button>

                <div className="grid grid-cols-3 gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-neutral-700 dark:bg-neutral-950">
                    {REGION_ANCHORS.map((anchor) => (
                        <button
                            key={anchor}
                            type="button"
                            className={
                                draftView.anchor === anchor
                                    ? "inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
                                    : "inline-flex h-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                            }
                            onClick={() =>
                                updateDraftView({
                                    ...draftView,
                                    anchor,
                                })
                            }
                            aria-label={ANCHOR_LABELS[anchor]}
                            title={ANCHOR_LABELS[anchor]}
                        >
                            {ANCHOR_SHORT_LABELS[anchor]}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {t("rows")}
                        <input
                            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                            type="number"
                            min={2}
                            max={boardSize}
                            value={draftView.rows}
                            onChange={handleNumberChange("rows")}
                        />
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {t("columns")}
                        <input
                            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                            type="number"
                            min={2}
                            max={boardSize}
                            value={draftView.columns}
                            onChange={handleNumberChange("columns")}
                        />
                    </label>
                </div>

                <button
                    type="button"
                    className="inline-flex h-11 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                    onClick={() => onApply(clampPositionView(draftView, boardSize))}
                >
                    {t("apply")}
                </button>
            </div>
        </div>
    );
}
