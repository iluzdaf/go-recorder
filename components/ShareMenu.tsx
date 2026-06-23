"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Copy, Download, Link2 } from "lucide-react";
import type { RefObject } from "react";

import { navigateWithinApp } from "../lib/fullscreenNavigation";
import { t } from "../lib/i18n";

export type ShareMenuMode = "chooser" | "created";

type ShareMenuProps = {
    alignToViewportTop?: boolean;
    canShareGame: boolean;
    isCreating: boolean;
    menuRef: RefObject<HTMLDivElement | null>;
    message: string | null;
    mode: ShareMenuMode;
    onCreateShare: () => void;
    onDownloadSgf: () => void;
    onCopyLink: () => void;
    qrCodeDataUrl: string | null;
    showSharePageLink?: boolean;
    sharePath: string | null;
};

export default function ShareMenu({
    alignToViewportTop = false,
    canShareGame,
    isCreating,
    menuRef,
    message,
    mode,
    onCreateShare,
    onDownloadSgf,
    onCopyLink,
    qrCodeDataUrl,
    showSharePageLink = true,
    sharePath,
}: ShareMenuProps) {
    const router = useRouter();
    const createdSharePath = mode === "created" ? sharePath : null;
    const hasCreatedShare = createdSharePath !== null;

    return (
        <div
            id="share-menu"
            ref={menuRef}
            className={
                alignToViewportTop
                    ? "absolute right-4 top-4 z-50 w-[min(42rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
                    : "fixed right-4 top-16 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            }
        >
            <div className="mb-3">
                <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                    {t("share")}
                </p>
            </div>
            <div
                className={
                    alignToViewportTop && hasCreatedShare
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
                    {hasCreatedShare ? (
                        <>
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
                            {showSharePageLink ? (
                                <button
                                    type="button"
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                    onClick={() => {
                                        navigateWithinApp({
                                            path: createdSharePath,
                                            push: router.push,
                                        });
                                    }}
                                    aria-label={t("goToSharePage")}
                                    title={t("goToSharePage")}
                                >
                                    <Link2 size={16} />
                                    <span>{t("goToSharePage")}</span>
                                </button>
                            ) : null}
                        </>
                    ) : (
                        <>
                            {isCreating ? null : (
                                <button
                                    type="button"
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                    disabled={!canShareGame}
                                    onClick={onCreateShare}
                                    aria-label={t("createLink")}
                                    title={
                                        canShareGame
                                            ? t("createLink")
                                            : t("addMoveBeforeSharing")
                                    }
                                >
                                    <Link2 size={16} />
                                    <span>{t("createLink")}</span>
                                </button>
                            )}
                        </>
                    )}
                    {message ? (
                        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-zinc-300">
                            {message}
                        </div>
                    ) : null}
                </div>

                {hasCreatedShare ? (
                    <div className="flex items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-neutral-700 dark:bg-neutral-950">
                        {qrCodeDataUrl ? (
                            <Image
                                src={qrCodeDataUrl}
                                alt={t("shareLink")}
                                width={240}
                                height={240}
                                unoptimized
                                className={
                                    alignToViewportTop ? "h-40 w-40" : "h-48 w-48"
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
                ) : null}
            </div>
        </div>
    );
}
