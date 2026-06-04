"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type { ComponentType, PointerEvent as ReactPointerEvent } from "react";
import {
    Copy,
    Download,
    ChevronLeft,
    ChevronRight,
    SkipBack,
    SkipForward,
    FileText,
    SquareArrowUpRight,
} from "lucide-react";
import QRCode from "qrcode";

import type { Move, SetupStone, ShareRecord, Stone } from "./types";
import { exportSgf, createSgfFilename } from "./sgf";
import { t } from "../lib/i18n";
import { useTheme } from "./AppShell";
import BoardStatusMessage from "./BoardStatusMessage";

// @sabaki/go-board does not ship TypeScript types, so keep the boundary small.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Board = require("@sabaki/go-board");

type ShudanGobanProps = {
    vertexSize: number;
    signMap: number[][];
    markerMap: (null | { type: "circle" })[][];
    showCoordinates: boolean;
};

const BoardView = ShudanGoban as unknown as ComponentType<ShudanGobanProps>;

type ActionBarAnchor = "left" | "center" | "right";

type ActionBarDragState = {
    pointerId: number;
    grabOffsetX: number;
};

function stoneToSign(stone: Stone) {
    return stone === "B" ? 1 : -1;
}

function buildBoardFromGameState(
    size: number,
    setupStones: SetupStone[],
    moves: Move[]
) {
    let board = Board.fromDimensions(size);

    for (const setupStone of setupStones) {
        board = board.makeMove(stoneToSign("B"), [setupStone.x, setupStone.y], {
            preventOverwrite: true,
            preventSuicide: true,
            preventKo: false,
        });
    }

    for (const move of moves) {
        if (move.type === "pass") continue;

        board = board.makeMove(stoneToSign(move.color), [move.x, move.y], {
            preventOverwrite: true,
            preventSuicide: true,
            preventKo: true,
        });
    }

    return board;
}

const BOARD_PADDING_PX = 16;

function getActionBarAnchorFromClientX({
    clientX,
    container,
}: {
    clientX: number;
    container: HTMLElement;
}): ActionBarAnchor {
    const { left, width } = container.getBoundingClientRect();
    const relativeX = clientX - left;

    if (relativeX < width / 3) return "left";
    if (relativeX < (width * 2) / 3) return "center";
    return "right";
}

export default function ShareGoBoard({ share }: { share: ShareRecord }) {
    const [vertexSize, setVertexSize] = useState(24);
    const { isDarkMode } = useTheme();
    const boardAreaRef = useRef<HTMLDivElement | null>(null);
    const shareMenuRef = useRef<HTMLDivElement | null>(null);
    const shareTriggerRef = useRef<HTMLButtonElement | null>(null);
    const actionBarRailRef = useRef<HTMLDivElement | null>(null);
    const actionBarDragRef = useRef<ActionBarDragState | null>(null);
    const [actionBarAnchor, setActionBarAnchor] =
        useState<ActionBarAnchor>("center");
    const [actionBarDragX, setActionBarDragX] = useState<number | null>(null);
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    const [shareStatus, setShareStatus] = useState<string | null>(null);
    const [shareQrCodeDataUrl, setShareQrCodeDataUrl] = useState<string | null>(
        null
    );
    const [visibleMoveCount, setVisibleMoveCount] = useState(
        share.gameState.moves.length
    );

    useEffect(() => {
        const boardArea = boardAreaRef.current;
        if (!boardArea) return;

        const updateVertexSize = () => {
            const { width, height } = boardArea.getBoundingClientRect();
            const availableSize = Math.max(
                0,
                Math.min(width, height) - BOARD_PADDING_PX
            );
            const coordinateGutterVertices = 1;
            const nextVertexSize = Math.max(
                16,
                Math.floor(
                    availableSize / (share.boardSize + coordinateGutterVertices)
                )
            );

            setVertexSize(nextVertexSize);
        };

        updateVertexSize();

        const resizeObserver = new ResizeObserver(updateVertexSize);
        resizeObserver.observe(boardArea);

        return () => resizeObserver.disconnect();
    }, [share.boardSize]);

    const visibleMoves = share.gameState.moves.slice(0, visibleMoveCount);
    const board = buildBoardFromGameState(
        share.boardSize,
        share.gameState.setupStones,
        visibleMoves
    );
    const signMap = board.signMap;

    type Marker = null | { type: "circle" };

    const markerMap: Marker[][] = Array.from({ length: share.boardSize }, () =>
        Array.from({ length: share.boardSize }, () => null)
    );

    const lastMove = visibleMoves.at(-1);
    if (lastMove?.type === "play") {
        markerMap[lastMove.y][lastMove.x] = { type: "circle" };
    }

    const sharePath = `/shares/${share.slug}`;

    const dismissShareStatus = useCallback(() => setShareStatus(null), []);

    const openShareMenu = useCallback(() => {
        setShareMenuOpen(true);
    }, []);

    const closeShareMenu = useCallback(() => {
        setShareMenuOpen(false);
        setShareQrCodeDataUrl(null);
    }, []);

    const toggleShareMenu = useCallback(() => {
        if (shareMenuOpen) {
            closeShareMenu();
            return;
        }

        openShareMenu();
    }, [closeShareMenu, openShareMenu, shareMenuOpen]);

    const handleDownloadSgf = useCallback(() => {
        const sgfFilename = createSgfFilename(
            share.blackPlayerName,
            share.whitePlayerName
        );

        const sgf = exportSgf({
            boardSize: share.boardSize,
            moves: share.gameState.moves,
            setupStones: share.gameState.setupStones,
            handicap: share.handicap,
            blackPlayerName: share.blackPlayerName,
            whitePlayerName: share.whitePlayerName,
        });

        const blob = new Blob([sgf], {
            type: "application/x-go-sgf;charset=utf-8",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = sgfFilename;
        link.click();

        URL.revokeObjectURL(url);
    }, [
        share.boardSize,
        share.blackPlayerName,
        share.gameState.moves,
        share.gameState.setupStones,
        share.handicap,
        share.whitePlayerName,
    ]);

    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(
                `${window.location.origin}${sharePath}`
            );
            setShareStatus(t("linkCopied"));
        } catch {
            setShareStatus(t("failedToCopyLink"));
        }
    }, [sharePath]);

    useEffect(() => {
        if (!shareMenuOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;

            const menuElement = shareMenuRef.current;
            const triggerElement = shareTriggerRef.current;

            if (
                menuElement?.contains(target) ||
                triggerElement?.contains(target)
            ) {
                return;
            }

            closeShareMenu();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeShareMenu();
            }
        };

        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [closeShareMenu, shareMenuOpen]);

    useEffect(() => {
        if (!shareMenuOpen) {
            return;
        }

        let cancelled = false;

        void QRCode.toDataURL(`${window.location.origin}${sharePath}`, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 240,
        })
            .then((nextQrCodeDataUrl: string) => {
                if (!cancelled) {
                    setShareQrCodeDataUrl(nextQrCodeDataUrl);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setShareQrCodeDataUrl(null);
                    setShareStatus(t("failedToGenerateQrCode"));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [shareMenuOpen, sharePath]);

    const handleJumpToStart = useCallback(() => {
        setVisibleMoveCount(0);
    }, []);

    const handlePreviousMove = useCallback(() => {
        setVisibleMoveCount((currentCount) => Math.max(0, currentCount - 1));
    }, []);

    const handleNextMove = useCallback(() => {
        setVisibleMoveCount((currentCount) =>
            Math.min(share.gameState.moves.length, currentCount + 1)
        );
    }, [share.gameState.moves.length]);

    const handleJumpToEnd = useCallback(() => {
        setVisibleMoveCount(share.gameState.moves.length);
    }, [share.gameState.moves.length]);

    const handleActionBarPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (
                event.target instanceof HTMLElement &&
                event.target.closest("button")
            ) {
                return;
            }

            const rail = actionBarRailRef.current;
            if (!rail) return;

            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);

            const barRect = event.currentTarget.parentElement?.getBoundingClientRect();
            if (!barRect) return;

            const railRect = rail.getBoundingClientRect();
            actionBarDragRef.current = {
                pointerId: event.pointerId,
                grabOffsetX: event.clientX - barRect.left,
            };

            const nextDragX = Math.max(
                0,
                Math.min(
                    barRect.left - railRect.left,
                    Math.max(0, railRect.width - barRect.width)
                )
            );

            setActionBarDragX(nextDragX);
        },
        []
    );

    const handleActionBarPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const dragState = actionBarDragRef.current;

            if (!dragState || dragState.pointerId !== event.pointerId) {
                return;
            }

            event.preventDefault();

            const rail = actionBarRailRef.current;
            if (!rail) return;

            const railRect = rail.getBoundingClientRect();
            const barRect = event.currentTarget.parentElement?.getBoundingClientRect();
            if (!barRect) return;

            const nextDragX = Math.max(
                0,
                Math.min(
                    event.clientX - railRect.left - dragState.grabOffsetX,
                    Math.max(0, railRect.width - barRect.width)
                )
            );
            setActionBarDragX(nextDragX);
        },
        []
    );

    const clearActionBarDragState = useCallback(
        (container: HTMLDivElement, pointerId: number) => {
            if (container?.hasPointerCapture(pointerId)) {
                container.releasePointerCapture(pointerId);
            }

            if (actionBarDragRef.current?.pointerId === pointerId) {
                actionBarDragRef.current = null;
            }
        },
        []
    );

    const finishActionBarDrag = useCallback(
        (container: HTMLDivElement, pointerId: number) => {
            clearActionBarDragState(container, pointerId);
            setActionBarDragX(null);
        },
        [clearActionBarDragState]
    );

    const handleActionBarPointerUp = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const dragState = actionBarDragRef.current;

            if (!dragState || dragState.pointerId !== event.pointerId) return;

            event.preventDefault();

            const rail = actionBarRailRef.current;
            if (!rail) {
                finishActionBarDrag(event.currentTarget, event.pointerId);
                return;
            }

            const nextAnchor = getActionBarAnchorFromClientX({
                clientX: event.clientX,
                container: rail,
            });

            setActionBarAnchor(nextAnchor);
            finishActionBarDrag(event.currentTarget, event.pointerId);
        },
        [finishActionBarDrag]
    );

    const handleActionBarPointerCancel = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (actionBarDragRef.current?.pointerId !== event.pointerId) return;

            finishActionBarDrag(event.currentTarget, event.pointerId);
        },
        [finishActionBarDrag]
    );

    const handleActionBarLostPointerCapture = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (actionBarDragRef.current?.pointerId !== event.pointerId) return;

            finishActionBarDrag(event.currentTarget, event.pointerId);
        },
        [finishActionBarDrag]
    );

    return (
        <div
            className={
                isDarkMode
                    ? "goban-theme-dark relative m-0 flex h-full touch-none flex-col overflow-hidden overscroll-none bg-neutral-900 p-0 text-white"
                    : "goban-theme-light relative m-0 flex h-full touch-none flex-col overflow-hidden overscroll-none bg-zinc-100 p-0 text-zinc-950"
            }
        >
            <div
                ref={boardAreaRef}
                className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden overscroll-none p-0"
            >
                <BoardStatusMessage
                    message={shareStatus}
                    onDismiss={dismissShareStatus}
                />
                {shareMenuOpen ? (
                    <div
                        id="share-menu"
                        ref={shareMenuRef}
                        className="fixed right-4 top-16 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
                    >
                        <div className="mb-3">
                            <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                                {t("share")}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                onClick={() => {
                                    handleDownloadSgf();
                                    closeShareMenu();
                                }}
                                aria-label={t("downloadSgf")}
                                title={t("downloadSgf")}
                            >
                                <Download size={16} />
                                <span>{t("downloadSgf")}</span>
                            </button>
                            <div className="flex items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-neutral-700 dark:bg-neutral-950">
                                {shareQrCodeDataUrl ? (
                                    <Image
                                        src={shareQrCodeDataUrl}
                                        alt={t("shareLink")}
                                        width={240}
                                        height={240}
                                        unoptimized
                                        className="h-48 w-48"
                                    />
                                ) : (
                                    <div className="flex h-48 w-48 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                                        {t("creatingQrCode")}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                onClick={handleCopyLink}
                                aria-label={t("copyLink")}
                                title={t("copyLink")}
                            >
                                <Copy size={16} />
                                <span>{t("copyLink")}</span>
                            </button>
                        </div>
                    </div>
                ) : null}
                <div
                    ref={actionBarRailRef}
                    className="absolute inset-x-3 bottom-3 z-40 h-14 select-none sm:bottom-4"
                >
                    <div className="relative h-full w-full">
                        <div
                            className={
                                actionBarDragX !== null
                                    ? "absolute top-1/2 -translate-y-1/2"
                                    : actionBarAnchor === "left"
                                        ? "absolute left-0 top-1/2 -translate-y-1/2"
                                        : actionBarAnchor === "right"
                                            ? "absolute right-0 top-1/2 -translate-y-1/2"
                                            : "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            }
                            style={
                                actionBarDragX !== null
                                    ? { left: `${actionBarDragX}px` }
                                    : undefined
                            }
                        >
                            <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                                <div
                                    className="inline-flex h-11 w-11 items-center justify-center text-zinc-700 dark:text-zinc-200"
                                    aria-hidden="true"
                                >
                                    <FileText size={18} />
                                </div>
                                <button
                                    type="button"
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                    onClick={handleJumpToStart}
                                    aria-label="Go to start"
                                    title="Go to start"
                                    disabled={visibleMoveCount === 0}
                                >
                                    <SkipBack size={18} />
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                    onClick={handlePreviousMove}
                                    aria-label="Previous move"
                                    title="Previous move"
                                    disabled={visibleMoveCount === 0}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                    onClick={handleNextMove}
                                    aria-label="Next move"
                                    title="Next move"
                                    disabled={
                                        visibleMoveCount ===
                                        share.gameState.moves.length
                                    }
                                >
                                    <ChevronRight size={18} />
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                    onClick={handleJumpToEnd}
                                    aria-label="Go to end"
                                    title="Go to end"
                                    disabled={
                                        visibleMoveCount ===
                                        share.gameState.moves.length
                                    }
                                    >
                                        <SkipForward size={18} />
                                </button>
                                <button
                                    type="button"
                                    ref={shareTriggerRef}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                    onClick={toggleShareMenu}
                                    aria-label={t("share")}
                                    aria-expanded={shareMenuOpen}
                                    aria-controls="share-menu"
                                    title={t("share")}
                                >
                                    <SquareArrowUpRight size={18} />
                                </button>
                                <div
                                    className="flex h-11 w-10 cursor-grab items-center justify-center active:cursor-grabbing"
                                    onPointerDown={handleActionBarPointerDown}
                                    onPointerMove={handleActionBarPointerMove}
                                    onPointerUp={handleActionBarPointerUp}
                                    onPointerCancel={handleActionBarPointerCancel}
                                    onLostPointerCapture={
                                        handleActionBarLostPointerCapture
                                    }
                                >
                                    <span
                                        aria-hidden="true"
                                        className="grid h-6 w-4 grid-cols-2 gap-x-1 gap-y-1"
                                    >
                                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="relative">
                    <BoardView
                        vertexSize={vertexSize}
                        signMap={signMap}
                        markerMap={markerMap}
                        showCoordinates
                    />
                </div>
            </div>
        </div>
    );
}
