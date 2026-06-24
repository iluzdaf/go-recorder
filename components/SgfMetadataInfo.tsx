"use client";

import { t } from "../lib/i18n";

type SgfMetadataInfoProps = {
    alignToViewportTop?: boolean;
    blackPlayerName: string | null;
    komi?: number | null;
    whitePlayerName: string | null;
};

export default function SgfMetadataInfo({
    alignToViewportTop = false,
    blackPlayerName,
    komi,
    whitePlayerName,
}: SgfMetadataInfoProps) {
    return (
        <div
            className={
                alignToViewportTop
                    ? "absolute right-4 top-4 z-50 w-64 rounded-lg border border-zinc-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
                    : "fixed right-4 top-16 z-50 w-64 rounded-lg border border-zinc-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            }
        >
            <div className="mb-3">
                <span className="text-sm font-medium">{t("sgfMetadata")}</span>
            </div>

            <dl className="flex flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {t("blackPlayer")}
                    </dt>
                    <dd className="text-sm text-zinc-950 dark:text-white">
                        {blackPlayerName ?? <span className="italic text-zinc-400 dark:text-zinc-500">{t("blackPlayerPlaceholder")}</span>}
                    </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {t("whitePlayer")}
                    </dt>
                    <dd className="text-sm text-zinc-950 dark:text-white">
                        {whitePlayerName ?? <span className="italic text-zinc-400 dark:text-zinc-500">{t("whitePlayerPlaceholder")}</span>}
                    </dd>
                </div>
                {komi != null && (
                    <div className="flex flex-col gap-0.5">
                        <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            {t("komi")}
                        </dt>
                        <dd className="text-sm text-zinc-950 dark:text-white">
                            {komi}
                        </dd>
                    </div>
                )}
            </dl>
        </div>
    );
}
