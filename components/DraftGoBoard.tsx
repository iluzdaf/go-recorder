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
import ShareMenu from "./ShareMenu";
import { downloadSgf } from "./sgf";
import { useHeaderStatus, useTheme } from "./AppShell";
import {
    applyBoardDraftStrokeVertex,
    clearDraftShareCache,
    getBoardDraftStrokeMode,
    type BoardDraftStrokeMode,
} from "../lib/boardDraft";
import { getLiveBoardGridMetrics } from "../lib/boardGeometry";
import { canShareDraft } from "../lib/draftSharing";
import { getVertexFromBoardPointer } from "../lib/gameCorrectionUi";
import { t } from "../lib/i18n";
import { saveLocalEditableRecord } from "../lib/localEditableSave";
import { getLocalRecord } from "../lib/localGames";
import { createShareFromLocalRecord } from "../lib/shareClient";
import { replayGame } from "../lib/gameReplay";
import {
    createVariationMoveNumberMarkerMap,
    type MoveNumberMarker,
    playVariationDraftMove,
    undoVariationDraftMove,
} from "../lib/variationDraft";
import useActionBarDrag from "./useActionBarDrag";
import useBoardGeometry from "./useBoardGeometry";
import useEditableShareMenuController from "./useEditableShareMenuController";

type ShudanGobanProps = {
    vertexSize: number;
    signMap: number[][];
    markerMap: (null | { type: "circle" } | MoveNumberMarker)[][];
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

    if (!record || record.recordKind !== "draft") {
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
    const hasPendingSaveRef = useRef(false);
    const [selectedColor, setSelectedColor] = useState<Stone>("B");
    const [shareStatus, setShareStatus] = useState<string | null>(null);
    const strokeStateRef = useRef<BoardDraftStrokeState | null>(null);
    const shareMenu = useEditableShareMenuController({
        initialShareSlug: draft?.lastShareSlug ?? null,
        onStatus: setShareStatus,
    });
    const {
        canAutoCreateNow,
        clearShareLink,
        close: closeEditableShareMenu,
        finishCreated: finishEditableShareCreated,
        markAutoCreateAttempted,
        setCreating: setEditableShareCreating,
        setError: setEditableShareError,
    } = shareMenu;
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

        const metrics = getLiveBoardGridMetrics({
            boardSize: draft.boardSize,
            gobanWrapper,
        });
        if (!metrics) return null;

        setGridMetrics(metrics.gridMetrics);
        return { gridGeometry: metrics.gridGeometry };
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
        clearShareLink();
    }, [clearShareLink]);

    const updateDraft = useCallback((nextDraft: LocalDraftRecord) => {
        draftRef.current = nextDraft;
        hasPendingSaveRef.current = true;
        setDraft(nextDraft);
    }, []);

    useEffect(() => {
        if (!draft || !hasPendingSaveRef.current) return;

        const timeoutId = window.setTimeout(() => {
            const pendingDraft = draftRef.current;
            if (!pendingDraft) return;

            try {
                const savedRecord = saveLocalEditableRecord({
                    record: pendingDraft,
                });

                if (savedRecord.recordKind !== "draft") {
                    return;
                }

                draftRef.current = savedRecord;
                hasPendingSaveRef.current = false;
                setDraft(savedRecord);
            } catch (error) {
                console.error("Failed to save draft", error);
            }
        }, 500);

        return () => window.clearTimeout(timeoutId);
    }, [draft]);

    const applyStrokeVertex = useCallback(
        ({
            mode,
            vertex,
        }: {
            mode: BoardDraftStrokeMode;
            vertex: Vertex;
        }) => {
            const currentDraft = draftRef.current;
            if (!currentDraft || currentDraft.draftKind !== "board") return;

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
            updateDraft(nextDraft);
        },
        [clearCachedShareLink, selectedColor, updateDraft]
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

    const handleVariationPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (
                event.target instanceof HTMLElement &&
                event.target.closest("button")
            ) {
                return;
            }

            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
        },
        []
    );

    const handleVariationPointerUp = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const releasePointerCapture = () => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                }
            };

            if (
                event.target instanceof HTMLElement &&
                event.target.closest("button")
            ) {
                releasePointerCapture();
                return;
            }

            const currentDraft = draftRef.current;
            if (!currentDraft || currentDraft.draftKind !== "variation") {
                releasePointerCapture();
                return;
            }

            const vertex = getVertexFromPointer(event);
            if (!vertex) {
                releasePointerCapture();
                return;
            }

            const result = playVariationDraftMove({
                boardSize: currentDraft.boardSize,
                gameState: currentDraft.gameState,
                vertex,
            });

            if (result.ok) {
                clearCachedShareLink();
                updateDraft(
                    clearDraftShareCache({
                        ...currentDraft,
                        gameState: result.gameState,
                    })
                );
            }

            releasePointerCapture();
        },
        [clearCachedShareLink, getVertexFromPointer, updateDraft]
    );

    const handleVariationPointerCancel = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
        },
        []
    );

    const handleVariationUndo = useCallback(() => {
        const currentDraft = draftRef.current;
        if (!currentDraft || currentDraft.draftKind !== "variation") return;
        if (currentDraft.baseMoveCount === null) return;

        const nextGameState = undoVariationDraftMove({
            baseMoveCount: currentDraft.baseMoveCount,
            gameState: currentDraft.gameState,
        });

        if (nextGameState === currentDraft.gameState) return;

        clearCachedShareLink();
        updateDraft(
            clearDraftShareCache({
                ...currentDraft,
                gameState: nextGameState,
            })
        );
    }, [clearCachedShareLink, updateDraft]);

    const handleDownloadSgf = useCallback(() => {
        const currentDraft = draftRef.current;
        if (!currentDraft) return;

        downloadSgf({
            boardSize: currentDraft.boardSize,
            moves:
                currentDraft.draftKind === "variation"
                    ? currentDraft.gameState.moves
                    : [],
            setupStones: currentDraft.gameState.setupStones,
            handicap: currentDraft.handicap,
            blackPlayerName: currentDraft.blackPlayerName,
            whitePlayerName: currentDraft.whitePlayerName,
        });
    }, []);

    const handleDownloadSgfFromShareMenu = useCallback(() => {
        handleDownloadSgf();
        closeEditableShareMenu();
    }, [closeEditableShareMenu, handleDownloadSgf]);

    const handleShare = useCallback(async () => {
        const currentDraft = draftRef.current;

        if (!currentDraft) {
            setEditableShareError(t("gameNotLoaded"));
            return;
        }

        if (!canShareDraft(currentDraft)) {
            setEditableShareError(t("addMoveBeforeSharing"));
            return;
        }

        setEditableShareCreating(t("creatingShare"));

        try {
            const { slug } = await createShareFromLocalRecord({
                localRecord: currentDraft,
                sourceKind: "draft",
            });
            const savedRecord = saveLocalEditableRecord({
                record: {
                    ...currentDraft,
                    lastShareSlug: slug,
                },
            });

            if (
                savedRecord.recordKind !== "draft"
            ) {
                return;
            }

            draftRef.current = savedRecord;
            hasPendingSaveRef.current = false;
            setDraft(savedRecord);
            finishEditableShareCreated(slug);
        } catch (error) {
            setEditableShareError(
                error instanceof Error ? error.message : t("failedToCreateShare")
            );
        }
    }, [
        finishEditableShareCreated,
        setEditableShareCreating,
        setEditableShareError,
    ]);

    useEffect(() => {
        if (!canAutoCreateNow) {
            return;
        }

        markAutoCreateAttempted();
        void handleShare();
    }, [canAutoCreateNow, handleShare, markAutoCreateAttempted]);

    if (!draft) {
        return (
            <div className="flex h-full items-center justify-center bg-zinc-100 p-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
                {t("gameNotFound")}
            </div>
        );
    }

    const variationReplay =
        draft.draftKind === "variation"
            ? replayGame({
                  boardSize: draft.boardSize,
                  setupStones: draft.gameState.setupStones,
                  moves: draft.gameState.moves,
              })
            : null;
    const signMap =
        draft.draftKind === "variation" && variationReplay
            ? variationReplay.board.signMap
            : createSignMap(draft);
    const markerMap =
        draft.draftKind === "variation"
              ? createVariationMoveNumberMarkerMap({
                  boardSize: draft.boardSize,
                  moves: draft.gameState.moves,
                  signMap,
                  startMoveIndex: draft.baseMoveCount ?? 0,
              })
            : Array.from({ length: draft.boardSize }, () =>
                  Array.from<null>({ length: draft.boardSize }).fill(null)
              );
    const canUndoVariation =
        draft.draftKind === "variation" &&
        draft.baseMoveCount !== null &&
        draft.gameState.moves.length > draft.baseMoveCount;
    const canShareCurrentDraft = canShareDraft(draft);

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
                {shareMenu.isOpen ? (
                    <ShareMenu
                        canShareGame={canShareCurrentDraft}
                        isCreating={shareMenu.isCreating}
                        menuRef={shareMenu.menuRef}
                        message={shareMenu.message}
                        mode={shareMenu.mode}
                        onCreateShare={handleShare}
                        onDownloadSgf={handleDownloadSgfFromShareMenu}
                        onCopyLink={shareMenu.copyShareLink}
                        qrCodeDataUrl={shareMenu.qrCodeDataUrl}
                        sharePath={shareMenu.sharePath}
                    />
                ) : null}
                <DraftBoardActionBar
                    anchor={actionBar.anchor}
                    dragX={actionBar.dragX}
                    canShareDraft={canShareCurrentDraft}
                    canUndo={canUndoVariation}
                    mode={draft.draftKind}
                    onLostPointerCapture={
                        actionBar.dragHandlers.onLostPointerCapture
                    }
                    onPointerCancel={actionBar.dragHandlers.onPointerCancel}
                    onPointerDown={actionBar.dragHandlers.onPointerDown}
                    onPointerMove={actionBar.dragHandlers.onPointerMove}
                    onPointerUp={actionBar.dragHandlers.onPointerUp}
                    onToggleColor={handleToggleColor}
                    onToggleShareMenu={shareMenu.toggle}
                    onUndo={handleVariationUndo}
                    railRef={actionBar.railRef}
                    selectedColor={selectedColor}
                    shareMenuOpen={shareMenu.isOpen}
                    shareTriggerRef={shareMenu.triggerRef}
                />
                <div
                    ref={gobanWrapperRef}
                    className="relative"
                    onPointerCancel={
                        draft.draftKind === "variation"
                            ? handleVariationPointerCancel
                            : finishBoardStroke
                    }
                    onPointerDown={
                        draft.draftKind === "variation"
                            ? handleVariationPointerDown
                            : handleBoardPointerDown
                    }
                    onPointerMove={
                        draft.draftKind === "variation"
                            ? undefined
                            : handleBoardPointerMove
                    }
                    onPointerUp={
                        draft.draftKind === "variation"
                            ? handleVariationPointerUp
                            : finishBoardStroke
                    }
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
