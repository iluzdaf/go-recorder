"use client";

import { Copy, Download, FileText, SquareArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useState, type RefObject } from "react";

import { t } from "../lib/i18n";

type Tab = "sgf" | "share";

type SgfShareInfoPanelProps = {
    alignToViewportTop?: boolean;
    menuRef: RefObject<HTMLDivElement | null>;
    // SGF tab (read-only)
    blackPlayerName: string | null;
    komi?: number | null;
    whitePlayerName: string | null;
    // Share tab
    message: string | null;
    onCopyLink: () => void;
    onDownloadSgf: () => void;
    qrCodeDataUrl: string | null;
};

export default function SgfShareInfoPanel({
    alignToViewportTop = false,
    menuRef,
    blackPlayerName,
    komi,
    whitePlayerName,
    message,
    onCopyLink,
    onDownloadSgf,
    qrCodeDataUrl,
}: SgfShareInfoPanelProps) {
    const [activeTab, setActiveTab] = useState<Tab>("share");

    const tabClass = (tab: Tab) =>
        `inline-flex flex-1 items-center justify-center gap-2 h-11 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab
                ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`;

    return (
        <div
            id="share-menu"
            ref={menuRef}
            className={
                alignToViewportTop
                    ? "absolute right-4 top-4 z-50 w-[min(42rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
                    : "fixed right-4 top-16 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            }
        >
            <div className="flex border-b border-zinc-200 dark:border-neutral-700">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "sgf"}
                    onClick={() => setActiveTab("sgf")}
                    className={tabClass("sgf")}
                >
                    <FileText size={15} />
                    <span>{t("sgfMetadata")}</span>
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "share"}
                    onClick={() => setActiveTab("share")}
                    className={tabClass("share")}
                >
                    <SquareArrowUpRight size={15} />
                    <span>{t("share")}</span>
                </button>
            </div>

            {activeTab === "sgf" ? (
                <div className="p-4">
                    <dl className="flex flex-col gap-2">
                        <div className="flex flex-col gap-0.5">
                            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                {t("blackPlayer")}
                            </dt>
                            <dd className="text-sm text-zinc-950 dark:text-white">
                                {blackPlayerName ?? (
                                    <span className="italic text-zinc-400 dark:text-zinc-500">
                                        {t("blackPlayerPlaceholder")}
                                    </span>
                                )}
                            </dd>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                {t("whitePlayer")}
                            </dt>
                            <dd className="text-sm text-zinc-950 dark:text-white">
                                {whitePlayerName ?? (
                                    <span className="italic text-zinc-400 dark:text-zinc-500">
                                        {t("whitePlayerPlaceholder")}
                                    </span>
                                )}
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
            ) : null}

            {activeTab === "share" ? (
                <div className="p-3">
                    <div
                        className={
                            alignToViewportTop
                                ? "grid grid-cols-[minmax(0,1fr)_12rem] gap-2"
                                : "flex flex-col gap-2"
                        }
                    >
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                onClick={onDownloadSgf}
                                aria-label={t("downloadSgf")}
                                title={t("downloadSgf")}
                            >
                                <Download size={16} />
                                <span>{t("downloadSgf")}</span>
                            </button>
                            <button
                                type="button"
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                onClick={onCopyLink}
                                aria-label={t("copyLink")}
                                title={t("copyLink")}
                            >
                                <Copy size={16} />
                                <span>{t("copyLink")}</span>
                            </button>
                            {message ? (
                                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-zinc-300">
                                    {message}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-neutral-700 dark:bg-neutral-950">
                            {qrCodeDataUrl ? (
                                <Image
                                    src={qrCodeDataUrl}
                                    alt={t("shareLink")}
                                    width={240}
                                    height={240}
                                    unoptimized
                                    className={
                                        alignToViewportTop
                                            ? "h-40 w-40"
                                            : "h-48 w-48"
                                    }
                                />
                            ) : (
                                <div
                                    className={
                                        alignToViewportTop
                                            ? "flex h-40 w-40 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400"
                                            : "flex h-48 w-48 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400"
                                    }
                                >
                                    {t("creatingQrCode")}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
