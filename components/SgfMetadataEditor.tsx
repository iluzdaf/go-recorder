"use client";

import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { t } from "../lib/i18n";

const KOMI_OPTIONS = [0, 0.5, 5.5, 6.5, 7.5] as const;

type SgfMetadataEditorProps = {
    alignToViewportTop?: boolean;
    blackPlayerName: string | null;
    komi: number;
    onSave: (values: {
        blackPlayerName: string | null;
        whitePlayerName: string | null;
        komi: number;
    }) => void;
    whitePlayerName: string | null;
};

export default function SgfMetadataEditor({
    alignToViewportTop = false,
    blackPlayerName,
    komi,
    onSave,
    whitePlayerName,
}: SgfMetadataEditorProps) {
    const [localBlack, setLocalBlack] = useState(blackPlayerName ?? "");
    const [localWhite, setLocalWhite] = useState(whitePlayerName ?? "");
    const [localKomi, setLocalKomi] = useState(
        KOMI_OPTIONS.includes(komi as (typeof KOMI_OPTIONS)[number]) ? komi : 6.5
    );

    function save(black: string, white: string, komiVal: number) {
        const trimmedBlack = black.trim();
        const trimmedWhite = white.trim();
        onSave({
            blackPlayerName: trimmedBlack.length > 0 ? trimmedBlack : null,
            whitePlayerName: trimmedWhite.length > 0 ? trimmedWhite : null,
            komi: komiVal,
        });
    }

    function handleSwap() {
        setLocalBlack(localWhite);
        setLocalWhite(localBlack);
        save(localWhite, localBlack, localKomi);
    }

    return (
        <div className={
            alignToViewportTop
                ? "absolute right-4 top-4 z-50 w-64 rounded-lg border border-zinc-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
                : "fixed right-4 top-16 z-50 w-64 rounded-lg border border-zinc-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        }>
            <div className="mb-3">
                <span className="text-sm font-medium">{t("editSgfMetadata")}</span>
            </div>

            <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {t("blackPlayer")}
                    </span>
                    <input
                        type="text"
                        value={localBlack}
                        onChange={(e) => setLocalBlack(e.target.value)}
                        onBlur={() => save(localBlack, localWhite, localKomi)}
                        placeholder={t("blackPlayerPlaceholder")}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-[16px] dark:border-neutral-700 dark:bg-neutral-800"
                    />
                </label>

                <div className="flex justify-center">
                    <button
                        type="button"
                        aria-label={t("swapPlayers")}
                        title={t("swapPlayers")}
                        onClick={handleSwap}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-zinc-400 dark:hover:bg-neutral-800 dark:hover:text-zinc-200"
                    >
                        <ArrowLeftRight size={13} />
                    </button>
                </div>

                <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {t("whitePlayer")}
                    </span>
                    <input
                        type="text"
                        value={localWhite}
                        onChange={(e) => setLocalWhite(e.target.value)}
                        onBlur={() => save(localBlack, localWhite, localKomi)}
                        placeholder={t("whitePlayerPlaceholder")}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-[16px] dark:border-neutral-700 dark:bg-neutral-800"
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {t("komi")}
                    </span>
                    <select
                        value={localKomi}
                        onChange={(e) => {
                            const newKomi = Number(e.target.value);
                            setLocalKomi(newKomi);
                            save(localBlack, localWhite, newKomi);
                        }}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-[16px] dark:border-neutral-700 dark:bg-neutral-800"
                    >
                        {KOMI_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </label>

            </div>
        </div>
    );
}
