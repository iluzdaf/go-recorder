"use client";

import { useCallback, useEffect, useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import { useRouter } from "next/navigation";
import type {
    ComponentType,
    PointerEvent as ReactPointerEvent,
} from "react";

import type { ShareRecord } from "./types";
import { downloadSgf } from "./sgf";
import { useHeaderStatus, useTheme } from "./AppShell";
import { getLiveBoardGridMetrics } from "../lib/boardGeometry";
import { getVertexFromBoardPointer } from "../lib/gameCorrectionUi";
import { t } from "../lib/i18n";
import {
    createLocalDraft,
    type CreateLocalDraftInput,
} from "../lib/localGames";
import { buildBoardFromGameState } from "../lib/shareBoardState";
import { toVariationDraftInput } from "../lib/shareFork";
import BoardStatusMessage from "./BoardStatusMessage";
import ShareBoardActionBar from "./ShareBoardActionBar";
import ShareMenu from "./ShareMenu";
import useActionBarDrag from "./useActionBarDrag";
import useBoardGeometry from "./useBoardGeometry";
import useShareMenu from "./useShareMenu";

type ShudanGobanProps = {
    vertexSize: number;
    signMap: number[][];
    markerMap: (null | { type: "circle" })[][];
    showCoordinates: boolean;
};

const BoardView = ShudanGoban as unknown as ComponentType<ShudanGobanProps>;

export default function ShareGoBoard({ share }: { share: ShareRecord }) {
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const { setHeaderStatus } = useHeaderStatus();
    const {
        boardAreaRef,
        gobanWrapperRef,
        setGridMetrics,
        vertexSize,
    } = useBoardGeometry({
        boardSize: share.boardSize,
        measureGrid: true,
    });
    const actionBar = useActionBarDrag();
    const [shareStatus, setShareStatus] = useState<string | null>(null);
    const [pendingVariationInput, setPendingVariationInput] =
        useState<CreateLocalDraftInput | null>(null);
    const sharePath = `/shares/${share.slug}`;
    const {
        close: closeShareMenu,
        copyShareLink,
        isOpen: shareMenuOpen,
        menuRef: shareMenuRef,
        qrCodeDataUrl: shareQrCodeDataUrl,
        toggle: toggleShareMenu,
        triggerRef: shareTriggerRef,
    } = useShareMenu({
        onStatus: setShareStatus,
        sharePath,
    });
    const [visibleMoveCount, setVisibleMoveCount] = useState(
        share.gameState.moves.length
    );

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

    const dismissShareStatus = useCallback(() => setShareStatus(null), []);

    const getGridMetrics = useCallback(() => {
        const gobanWrapper = gobanWrapperRef.current;
        if (!gobanWrapper) return null;

        const metrics = getLiveBoardGridMetrics({
            boardSize: share.boardSize,
            gobanWrapper,
        });
        if (!metrics) return null;

        setGridMetrics(metrics.gridMetrics);
        return { gridGeometry: metrics.gridGeometry };
    }, [gobanWrapperRef, setGridMetrics, share.boardSize]);

    const getVertexFromPointer = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const metrics = getGridMetrics();
            if (!metrics) return null;

            return getVertexFromBoardPointer({
                clientX: event.clientX,
                clientY: event.clientY,
                grid: metrics.gridGeometry,
            });
        },
        [getGridMetrics]
    );

    useEffect(() => {
        setHeaderStatus(
            shareStatus ? (
                <BoardStatusMessage
                    message={shareStatus}
                    onDismiss={dismissShareStatus}
                />
            ) : null
        );

        return () => setHeaderStatus(null);
    }, [dismissShareStatus, setHeaderStatus, shareStatus]);

    const handleDownloadSgf = useCallback(() => {
        downloadSgf({
            boardSize: share.boardSize,
            moves: share.gameState.moves,
            setupStones: share.gameState.setupStones,
            handicap: share.handicap,
            blackPlayerName: share.blackPlayerName,
            whitePlayerName: share.whitePlayerName,
        });
    }, [
        share.boardSize,
        share.blackPlayerName,
        share.gameState.moves,
        share.gameState.setupStones,
        share.handicap,
        share.whitePlayerName,
    ]);

    const handleBoardPointerUp = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (
                pendingVariationInput ||
                shareMenuOpen ||
                (event.target instanceof HTMLElement &&
                    event.target.closest("button"))
            ) {
                return;
            }

            const vertex = getVertexFromPointer(event);
            if (!vertex) return;

            const variation = toVariationDraftInput({
                share,
                vertex,
                visibleMoveCount,
            });

            if (!variation.ok) return;

            setPendingVariationInput(variation.input);
        },
        [
            getVertexFromPointer,
            pendingVariationInput,
            share,
            shareMenuOpen,
            visibleMoveCount,
        ]
    );

    const handleCancelVariation = useCallback(() => {
        setPendingVariationInput(null);
    }, []);

    const handleConfirmVariation = useCallback(() => {
        if (!pendingVariationInput) return;

        const draft = createLocalDraft(pendingVariationInput);
        router.push(`/drafts/${draft.id}`);
    }, [pendingVariationInput, router]);

    const handleDownloadSgfFromShareMenu = useCallback(() => {
        handleDownloadSgf();
        closeShareMenu();
    }, [closeShareMenu, handleDownloadSgf]);

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
                {shareMenuOpen ? (
                    <ShareMenu
                        canShareGame
                        isCreating={false}
                        menuRef={shareMenuRef}
                        message={null}
                        mode="created"
                        onCreateShare={() => {}}
                        onDownloadSgf={handleDownloadSgfFromShareMenu}
                        onCopyLink={copyShareLink}
                        qrCodeDataUrl={shareQrCodeDataUrl}
                        showSharePageLink={false}
                        sharePath={sharePath}
                    />
                ) : null}
                {pendingVariationInput ? (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="variation-draft-title"
                        className="absolute left-1/2 top-4 z-20 w-[min(calc(100%-2rem),20rem)] -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-3 text-zinc-950 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    >
                        <p
                            id="variation-draft-title"
                            className="text-sm font-medium"
                        >
                            {t("createVariationPrompt")}
                        </p>
                        <div className="mt-3 flex justify-end gap-2">
                            <button
                                type="button"
                                className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-sm text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                onClick={handleCancelVariation}
                            >
                                {t("cancel")}
                            </button>
                            <button
                                type="button"
                                className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-950 px-3 text-sm text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                onClick={handleConfirmVariation}
                            >
                                {t("createVariation")}
                            </button>
                        </div>
                    </div>
                ) : null}
                <ShareBoardActionBar
                    anchor={actionBar.anchor}
                    dragX={actionBar.dragX}
                    onJumpToEnd={handleJumpToEnd}
                    onJumpToStart={handleJumpToStart}
                    onLostPointerCapture={
                        actionBar.dragHandlers.onLostPointerCapture
                    }
                    onNextMove={handleNextMove}
                    onPointerCancel={actionBar.dragHandlers.onPointerCancel}
                    onPointerDown={actionBar.dragHandlers.onPointerDown}
                    onPointerMove={actionBar.dragHandlers.onPointerMove}
                    onPointerUp={actionBar.dragHandlers.onPointerUp}
                    onPreviousMove={handlePreviousMove}
                    onToggleShareMenu={toggleShareMenu}
                    railRef={actionBar.railRef}
                    shareMenuOpen={shareMenuOpen}
                    shareTriggerRef={shareTriggerRef}
                    totalMoveCount={share.gameState.moves.length}
                    visibleMoveCount={visibleMoveCount}
                />
                <div
                    ref={gobanWrapperRef}
                    className="relative"
                    onPointerUp={handleBoardPointerUp}
                >
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
