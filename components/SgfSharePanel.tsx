"use client";

import {
    ArrowLeftRight,
    ChevronDown,
    Copy,
    Download,
    FileText,
    Link2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type RefObject } from "react";

import { navigateWithinApp } from "../lib/fullscreenNavigation";
import { t } from "../lib/i18n";
import type { ShareMenuMode } from "./ShareMenu";
import type { BoardSize, PositionView } from "./types";
import PositionViewSettingsDialog from "./PositionViewSettingsDialog";

const KOMI_OPTIONS = [0, 0.5, 5.5, 6.5, 7.5] as const;

type Tab = "sgf" | "share";

type SgfSharePanelProps = {
    alignToViewportTop?: boolean;
    menuRef: RefObject<HTMLDivElement | null>;
    // SGF tab
    blackPlayerName: string | null;
    boardSize?: BoardSize;
    komi?: number | null;
    onChangePositionView?: (positionView: PositionView) => void;
    positionView?: PositionView | null;
    sgfReadOnly?: boolean;
    whitePlayerName: string | null;
    onSaveSgfMetadata?: (values: {
        blackPlayerName: string | null;
        whitePlayerName: string | null;
        komi: number;
    }) => void;
    // Share tab
    canShareGame: boolean;
    isCreating: boolean;
    message: string | null;
    mode: ShareMenuMode;
    onCreateShare: () => void;
    onDownloadSgf: () => void;
    onCopyLink: () => void;
    qrCodeDataUrl: string | null;
    showSharePageLink?: boolean;
    sharePath: string | null;
};

export default function SgfSharePanel({
    alignToViewportTop = false,
    menuRef,
    blackPlayerName,
    boardSize,
    komi,
    onChangePositionView,
    positionView,
    sgfReadOnly = false,
    whitePlayerName,
    onSaveSgfMetadata,
    canShareGame,
    isCreating,
    message,
    mode,
    onCreateShare,
    onDownloadSgf,
    onCopyLink,
    qrCodeDataUrl,
    showSharePageLink = true,
    sharePath,
}: SgfSharePanelProps) {
    type AccordionSection = "players" | "position" | "rules";

    const [activeTab, setActiveTab] = useState<Tab>("sgf");
    const [openSection, setOpenSection] = useState<AccordionSection | null>("players");
    const [localBlack, setLocalBlack] = useState(blackPlayerName ?? "");
    const [localWhite, setLocalWhite] = useState(whitePlayerName ?? "");
    const [localKomi, setLocalKomi] = useState(
        KOMI_OPTIONS.includes(komi as (typeof KOMI_OPTIONS)[number]) ? komi ?? 6.5 : 6.5
    );

    const toggleSection = (section: AccordionSection) =>
        setOpenSection((prev) => (prev === section ? null : section));

    const router = useRouter();
    const createdSharePath = mode === "created" ? sharePath : null;
    const hasCreatedShare = createdSharePath !== null;

    function save(black: string, white: string, komiVal: number) {
        const trimmedBlack = black.trim();
        const trimmedWhite = white.trim();
        onSaveSgfMetadata?.({
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
                    <Link2 size={15} />
                    <span>{t("share")}</span>
                </button>
            </div>

            {activeTab === "sgf" && sgfReadOnly ? (
                <div className="flex flex-col gap-3 p-4">
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
                </div>
            ) : null}

            {activeTab === "sgf" && !sgfReadOnly ? (
                <div className="flex flex-col">
                    {/* Players accordion section */}
                    <div className="border-b border-zinc-100 dark:border-neutral-800">
                        <button
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-950 dark:text-white"
                            onClick={() => toggleSection("players")}
                            aria-expanded={openSection === "players"}
                        >
                            {t("players")}
                            <ChevronDown
                                size={15}
                                className={`transition-transform ${openSection === "players" ? "rotate-180" : ""}`}
                            />
                        </button>
                        {openSection === "players" && (
                            <div className="flex flex-col gap-3 px-4 pb-4">
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
                            </div>
                        )}
                    </div>

                    {/* Position view accordion section — board drafts only */}
                    {onChangePositionView && boardSize ? (
                        <div className="border-b border-zinc-100 dark:border-neutral-800">
                            <button
                                type="button"
                                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-950 dark:text-white"
                                onClick={() => toggleSection("position")}
                                aria-expanded={openSection === "position"}
                            >
                                {t("positionView")}
                                <ChevronDown
                                    size={15}
                                    className={`transition-transform ${openSection === "position" ? "rotate-180" : ""}`}
                                />
                            </button>
                            {openSection === "position" && (
                                <div className="px-4 pb-4">
                                    <PositionViewSettingsDialog
                                        alignToViewportTop={alignToViewportTop}
                                        boardSize={boardSize}
                                        onChange={onChangePositionView}
                                        positionView={positionView ?? null}
                                    />
                                </div>
                            )}
                        </div>
                    ) : null}

                    {/* Other accordion section */}
                    <div className="border-b border-zinc-100 dark:border-neutral-800">
                        <button
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-950 dark:text-white"
                            onClick={() => toggleSection("rules")}
                            aria-expanded={openSection === "rules"}
                        >
                            {t("rules")}
                            <ChevronDown
                                size={15}
                                className={`transition-transform ${openSection === "rules" ? "rotate-180" : ""}`}
                            />
                        </button>
                        {openSection === "rules" && (
                            <div className="px-4 pb-4">
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
                        )}
                    </div>

                    <div className="p-4">
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
                    </div>
                </div>
            ) : null}

            {activeTab === "share" ? (
                <div className="p-3">
                    <div
                        className={
                            alignToViewportTop && hasCreatedShare
                                ? "grid grid-cols-[minmax(0,1fr)_12rem] gap-2"
                                : "flex flex-col gap-2"
                        }
                    >
                        <div className="flex flex-col gap-2">
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
                                    {isCreating ? null : canShareGame ? (
                                        <button
                                            type="button"
                                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                            onClick={onCreateShare}
                                            aria-label={t("createLink")}
                                            title={t("createLink")}
                                        >
                                            <Link2 size={16} />
                                            <span>{t("createLink")}</span>
                                        </button>
                                    ) : (
                                        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-zinc-300">
                                            {t("addMoveBeforeSharing")}
                                        </div>
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
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
