"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type {
    ComponentType,
    PointerEvent as ReactPointerEvent,
} from "react";

import type { LocalDraftRecord, Stone } from "./types";
import BoardStatusMessage from "./BoardStatusMessage";
import DraftBoardActionBar from "./DraftBoardActionBar";
import ShareMenu, { type ShareMenuMode } from "./ShareMenu";
import { exportSgf, createSgfFilename } from "./sgf";
import { useHeaderStatus, useTheme } from "./AppShell";
import {
    applyBoardDraftStrokeVertex,
    clearDraftShareCache,
    getBoardDraftStrokeMode,
    type BoardDraftStrokeMode,
} from "../lib/boardDraft";
import {
    getVertexFromBoardPointer,
    type BoardGridGeometry,
} from "../lib/gameCorrectionUi";
import { t } from "../lib/i18n";
import { getLocalRecord, saveLocalRecord } from "../lib/localGames";
import { createShareFromLocalRecord } from "../lib/shareClient";
import useActionBarDrag from "./useActionBarDrag";
import useBoardGeometry from "./useBoardGeometry";
import useShareMenu from "./useShareMenu";

type ShudanGobanProps = {
    vertexSize: number;
    signMap: number[][];
    markerMap: null[][];
    showCoordinates: boolean;
};

type DraftGoBoardProps = {
    id: string;
};

type Vertex = {
    x: number;
    y: number;
};

type BoardDraftStrokeState = {
    mode: BoardDraftStrokeMode;
    pointerId: number;
    visitedVertices: Set<string>;
};

const BoardView = ShudanGoban as unknown as ComponentType<ShudanGobanProps>;

function stoneToSign(stone: Stone) {
    return stone === "B" ? 1 : -1;
}

function createSignMap(draft: LocalDraftRecord) {
    const signMap = Array.from({ length: draft.boardSize }, () =>
        Array.from({ length: draft.boardSize }, () => 0)
    );

    for (const setupStone of draft.gameState.setupStones) {
        signMap[setupStone.y][setupStone.x] = stoneToSign(setupStone.color);
    }

    return signMap;
}

function loadLocalBoardDraft(id: string) {
    const record = getLocalRecord(id);

    if (
        !record ||
        record.recordKind !== "draft" ||
        record.draftKind !== "board"
    ) {
        return null;
    }

    return record;
}

export default function DraftGoBoard({ id }: DraftGoBoardProps) {
    const { isDarkMode } = useTheme();
    const { setHeaderStatus } = useHeaderStatus();
    const [draft, setDraft] = useState<LocalDraftRecord | null>(() =>
        loadLocalBoardDraft(id)
    );
    const draftRef = useRef<LocalDraftRecord | null>(draft);
    const [selectedColor, setSelectedColor] = useState<Stone>("B");
    const [shareSlug, setShareSlug] = useState<string | null>(
        draft?.lastShareSlug ?? null
    );
    const [shareStatus, setShareStatus] = useState<string | null>(null);
    const [shareMenuMode, setShareMenuMode] =
        useState<ShareMenuMode>(draft?.lastShareSlug ? "created" : "chooser");
    const [shareMenuMessage, setShareMenuMessage] = useState<string | null>(
        null
    );
    const [shareMenuIsCreating, setShareMenuIsCreating] = useState(false);
    const shareAutoCreateAttemptedRef = useRef(false);
    const strokeStateRef = useRef<BoardDraftStrokeState | null>(null);
    const sharePath = shareSlug ? `/shares/${shareSlug}` : null;
    const actionBar = useActionBarDrag();
    const {
        boardAreaRef,
        gobanWrapperRef,
        setGridMetrics,
        vertexSize,
    } = useBoardGeometry({
        boardSize: draft?.boardSize ?? 19,
        measureGrid: true,
    });
    const resetShareMenuState = useCallback(() => {
        shareAutoCreateAttemptedRef.current = false;
        setShareMenuMessage(null);
        setShareMenuIsCreating(false);
    }, []);
    const {
        clearQrCode: clearShareQrCode,
        close: closeShareMenu,
        copyShareLink,
        isOpen: shareMenuOpen,
        menuRef: shareMenuRef,
        open: openShareMenuBase,
        qrCodeDataUrl: shareQrCodeDataUrl,
        triggerRef: shareTriggerRef,
    } = useShareMenu({
        onClose: resetShareMenuState,
        onStatus: setShareStatus,
        sharePath,
        shouldGenerateQrCode: shareMenuMode === "created",
    });
    const dismissShareStatus = useCallback(() => setShareStatus(null), []);

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

    const getGridMetrics = useCallback(() => {
        const gobanWrapper = gobanWrapperRef.current;
        if (!gobanWrapper || !draft) return null;

        const grid = gobanWrapper.querySelector(".shudan-grid");
        if (!(grid instanceof SVGElement)) return null;

        const wrapperRect = gobanWrapper.getBoundingClientRect();
        const gridRect = grid.getBoundingClientRect();
        const nextGridMetrics = {
            left: gridRect.left - wrapperRect.left,
            top: gridRect.top - wrapperRect.top,
            cellSize: gridRect.width / draft.boardSize,
            boardSizePx: gridRect.width,
        };
        const gridGeometry: BoardGridGeometry = {
            left: gridRect.left,
            top: gridRect.top,
            cellSize: nextGridMetrics.cellSize,
            boardSize: draft.boardSize,
        };

        setGridMetrics(nextGridMetrics);

        return { gridGeometry };
    }, [draft, gobanWrapperRef, setGridMetrics]);

    const getVertexFromPointer = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>): Vertex | null => {
            const gobanWrapper = gobanWrapperRef.current;
            if (!gobanWrapper || !draft) return null;

            const metrics = getGridMetrics();
            if (!metrics) return null;

            return getVertexFromBoardPointer({
                clientX: event.clientX,
                clientY: event.clientY,
                grid: metrics.gridGeometry,
            });
        },
        [draft, getGridMetrics, gobanWrapperRef]
    );

    const clearCachedShareLink = useCallback(() => {
        setShareSlug(null);
        setShareMenuMode("chooser");
        clearShareQrCode();
    }, [clearShareQrCode]);

    const saveDraft = useCallback((nextDraft: LocalDraftRecord) => {
        const savedRecord = saveLocalRecord(nextDraft);

        if (
            savedRecord.recordKind !== "draft" ||
            savedRecord.draftKind !== "board"
        ) {
            return;
        }

        draftRef.current = savedRecord;
        setDraft(savedRecord);
    }, []);

    const applyStrokeVertex = useCallback(
        ({
            mode,
            vertex,
        }: {
            mode: BoardDraftStrokeMode;
            vertex: Vertex;
        }) => {
            const currentDraft = draftRef.current;
            if (!currentDraft) return;

            const nextGameState = applyBoardDraftStrokeVertex({
                gameState: currentDraft.gameState,
                mode,
                selectedColor,
                vertex,
            });

            if (nextGameState === currentDraft.gameState) return;

            const nextDraft = clearDraftShareCache({
                ...currentDraft,
                gameState: nextGameState,
            });

            clearCachedShareLink();
            saveDraft(nextDraft);
        },
        [clearCachedShareLink, saveDraft, selectedColor]
    );

    const visitStrokeVertex = useCallback(
        ({
            mode,
            vertex,
            visitedVertices,
        }: {
            mode: BoardDraftStrokeMode;
            vertex: Vertex;
            visitedVertices: Set<string>;
        }) => {
            const vertexKey = `${vertex.x},${vertex.y}`;
            if (visitedVertices.has(vertexKey)) return;

            visitedVertices.add(vertexKey);
            applyStrokeVertex({
                mode,
                vertex,
            });
        },
        [applyStrokeVertex]
    );

    const handleBoardPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (
                event.target instanceof HTMLElement &&
                event.target.closest("button")
            ) {
                return;
            }

            const currentDraft = draftRef.current;
            if (!currentDraft) return;

            const vertex = getVertexFromPointer(event);
            if (!vertex) return;

            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);

            const mode = getBoardDraftStrokeMode({
                gameState: currentDraft.gameState,
                vertex,
            });
            const visitedVertices = new Set<string>();
            strokeStateRef.current = {
                mode,
                pointerId: event.pointerId,
                visitedVertices,
            };
            visitStrokeVertex({
                mode,
                vertex,
                visitedVertices,
            });
        },
        [getVertexFromPointer, visitStrokeVertex]
    );

    const handleBoardPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const strokeState = strokeStateRef.current;
            if (!strokeState || strokeState.pointerId !== event.pointerId) {
                return;
            }

            const vertex = getVertexFromPointer(event);
            if (!vertex) return;

            event.preventDefault();
            visitStrokeVertex({
                mode: strokeState.mode,
                vertex,
                visitedVertices: strokeState.visitedVertices,
            });
        },
        [getVertexFromPointer, visitStrokeVertex]
    );

    const finishBoardStroke = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const strokeState = strokeStateRef.current;
            if (!strokeState || strokeState.pointerId !== event.pointerId) {
                return;
            }

            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }

            strokeStateRef.current = null;
        },
        []
    );

    const handleToggleColor = useCallback(() => {
        setSelectedColor((currentColor) => (currentColor === "B" ? "W" : "B"));
    }, []);

    const openShareMenu = useCallback(() => {
        setShareMenuMode(shareSlug ? "created" : "chooser");
        openShareMenuBase();
    }, [openShareMenuBase, shareSlug]);

    const toggleShareMenu = useCallback(() => {
        if (shareMenuOpen) {
            closeShareMenu();
            return;
        }

        openShareMenu();
    }, [closeShareMenu, openShareMenu, shareMenuOpen]);

    const handleDownloadSgf = useCallback(() => {
        const currentDraft = draftRef.current;
        if (!currentDraft) return;

        const sgf = exportSgf({
            boardSize: currentDraft.boardSize,
            moves: [],
            setupStones: currentDraft.gameState.setupStones,
            handicap: currentDraft.handicap,
            blackPlayerName: currentDraft.blackPlayerName,
            whitePlayerName: currentDraft.whitePlayerName,
        });
        const blob = new Blob([sgf], {
            type: "application/x-go-sgf;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = createSgfFilename(
            currentDraft.blackPlayerName,
            currentDraft.whitePlayerName
        );
        link.click();

        URL.revokeObjectURL(url);
    }, []);

    const handleDownloadSgfFromShareMenu = useCallback(() => {
        handleDownloadSgf();
        closeShareMenu();
    }, [closeShareMenu, handleDownloadSgf]);

    const handleShare = useCallback(async () => {
        const currentDraft = draftRef.current;

        if (!currentDraft) {
            setShareMenuMessage(t("gameNotLoaded"));
            setShareMenuIsCreating(false);
            return;
        }

        setShareMenuIsCreating(true);
        setShareMenuMessage(t("creatingShare"));

        try {
            const { slug } = await createShareFromLocalRecord({
                localRecord: currentDraft,
                sourceKind: "draft",
            });
            const savedRecord = saveLocalRecord({
                ...currentDraft,
                lastShareSlug: slug,
            });

            if (
                savedRecord.recordKind !== "draft" ||
                savedRecord.draftKind !== "board"
            ) {
                return;
            }

            draftRef.current = savedRecord;
            setDraft(savedRecord);
            setShareSlug(slug);
            setShareMenuMode("created");
            openShareMenuBase();
            clearShareQrCode();
            setShareMenuMessage(null);
            setShareMenuIsCreating(false);
        } catch (error) {
            setShareMenuMessage(
                error instanceof Error ? error.message : t("failedToCreateShare")
            );
            setShareMenuIsCreating(false);
        }
    }, [clearShareQrCode, openShareMenuBase]);

    useEffect(() => {
        if (!shareMenuOpen || shareMenuMode !== "chooser" || sharePath) {
            return;
        }

        if (shareAutoCreateAttemptedRef.current) {
            return;
        }

        shareAutoCreateAttemptedRef.current = true;
        void handleShare();
    }, [handleShare, shareMenuMode, shareMenuOpen, sharePath]);

    if (!draft) {
        return (
            <div className="flex h-full items-center justify-center bg-zinc-100 p-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
                {t("gameNotFound")}
            </div>
        );
    }

    const signMap = createSignMap(draft);
    const markerMap: null[][] = Array.from({ length: draft.boardSize }, () =>
        Array.from({ length: draft.boardSize }, () => null)
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
                {shareMenuOpen ? (
                    <ShareMenu
                        canShareGame
                        isCreating={shareMenuIsCreating}
                        menuRef={shareMenuRef}
                        message={shareMenuMessage}
                        mode={shareMenuMode}
                        onCreateShare={handleShare}
                        onDownloadSgf={handleDownloadSgfFromShareMenu}
                        onCopyLink={copyShareLink}
                        qrCodeDataUrl={shareQrCodeDataUrl}
                        sharePath={sharePath}
                    />
                ) : null}
                <DraftBoardActionBar
                    anchor={actionBar.anchor}
                    dragX={actionBar.dragX}
                    onLostPointerCapture={
                        actionBar.dragHandlers.onLostPointerCapture
                    }
                    onPointerCancel={actionBar.dragHandlers.onPointerCancel}
                    onPointerDown={actionBar.dragHandlers.onPointerDown}
                    onPointerMove={actionBar.dragHandlers.onPointerMove}
                    onPointerUp={actionBar.dragHandlers.onPointerUp}
                    onToggleColor={handleToggleColor}
                    onToggleShareMenu={toggleShareMenu}
                    railRef={actionBar.railRef}
                    selectedColor={selectedColor}
                    shareMenuOpen={shareMenuOpen}
                    shareTriggerRef={shareTriggerRef}
                />
                <div
                    ref={gobanWrapperRef}
                    className="relative"
                    onPointerCancel={finishBoardStroke}
                    onPointerDown={handleBoardPointerDown}
                    onPointerMove={handleBoardPointerMove}
                    onPointerUp={finishBoardStroke}
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
