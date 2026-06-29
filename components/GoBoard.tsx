"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type { ComponentType } from "react";

import type {
    BoardSize,
    GameState,
    LocalGameRecord,
    Move,
    Stone,
} from "./types";
import { downloadSgf } from "./sgf";
import { createGameSnapshot, shouldAutosave } from "../lib/gameLogic";
import { getLocalGame } from "../lib/localGames";
import { saveLocalEditableRecord } from "../lib/localEditableSave";
import { createLoadedLocalGame } from "../lib/localGameView";
import { createShareFromLocalGame } from "../lib/shareClient";
import {
    consumeSharePrivacyResumeContext,
    acknowledgeSharePrivacy,
    markSharePrivacyResumeContext,
    hasAcknowledgedSharePrivacy,
} from "../lib/sharePrivacy";
import { formatMoveEditError, t } from "../lib/i18n";
import {
    useBoardDisplaySettings,
    useHeaderStatus,
    useHeaderVisibility,
    useTheme,
} from "./AppShell";
import BoardStatusMessage from "./BoardStatusMessage";
import ConfirmDialog from "./ConfirmDialog";
import RecorderActionBar from "./RecorderActionBar";
import SharePrivacyDialog from "./SharePrivacyDialog";
import SgfSharePanel from "./SgfSharePanel";
import useActionBarDrag from "./useActionBarDrag";
import useBoardGeometry from "./useBoardGeometry";
import useEditableShareMenuController from "./useEditableShareMenuController";
import { playGameMove, replayGame } from "../lib/gameReplay";
import { isActionBarAnchor } from "../lib/actionBarDrag";
import { getLiveBoardGridMetrics } from "../lib/boardGeometry";
import {
    applyRecorderCorrection,
    createStoneSelectionDragState,
    getEditableMoveIndexAtVertex,
    getPlacementZoomWindow,
    getSelectedMoveVertices,
    getStoneCorrectionOrigin,
    getStoneSelectionDragVertexFromPointer,
    getVertexFromBoardPointer,
    getVertexFromPlacementZoomPointer,
    isRecorderCorrectionLegal,
    shouldUsePlacementZoom,
    type BoardGridGeometry,
} from "../lib/gameCorrectionUi";
import {
    useStoneCorrection,
    type StoneCorrectionAdapter,
    type StoneCorrectionGeometry,
    type StoneCorrectionMarker,
} from "./useStoneCorrection";

function stoneToSign(stone: Stone) {
    return stone === "B" ? 1 : -1;
}

function cloneSignMap(signMap: number[][]) {
    return signMap.map((row) => [...row]);
}

type ShudanGobanProps = {
    vertexSize: number;
    signMap: number[][];
    markerMap: (null | { type: "circle" })[][];
    showCoordinates: boolean;
    rangeX?: [number, number];
    rangeY?: [number, number];
    selectedVertices?: [number, number][];
    dimmedVertices?: [number, number][];
    fuzzyStonePlacement?: boolean;
    animateStonePlacement?: boolean;
};

const BoardView = ShudanGoban as unknown as ComponentType<ShudanGobanProps>;

type GoBoardProps = {
    id: string;
};

const ACTION_BAR_STORAGE_KEY_PREFIX = "go-recorder:game-action-bar-anchor:";

function getActionBarStorageKey(id: string) {
    return `${ACTION_BAR_STORAGE_KEY_PREFIX}${id}`;
}

export default function GoBoard({ id }: GoBoardProps) {
    const [size, setSize] = useState<BoardSize>(19);
    const { isDarkMode } = useTheme();
    const { showBoardCoordinates, twoStepPlacement } = useBoardDisplaySettings();
    const { setHeaderStatus } = useHeaderStatus();
    const { isOverlayHeader } = useHeaderVisibility();
    const hasLoadedGameRef = useRef(false);
    const lastSavedSnapshotRef = useRef("");
    const localGameRecordRef = useRef<LocalGameRecord | null>(null);
    const hasExistingShareRef = useRef(false);
    const [pendingEditFn, setPendingEditFn] = useState<(() => void) | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [shareStatus, setShareStatus] = useState<string | null>(null);
    const [shouldResumeSharePrivacy] = useState(() =>
        consumeSharePrivacyResumeContext({
            kind: "game",
            id,
        })
    );
    const [isSharePrivacyDialogOpen, setIsSharePrivacyDialogOpen] = useState(
        shouldResumeSharePrivacy
    );
    const dismissShareStatus = useCallback(() => setShareStatus(null), []);
    const shareMenu = useEditableShareMenuController({
        initialIsOpen: shouldResumeSharePrivacy,
    });
    const {
        clearShareLink,
        close: closeEditableShareMenu,
        finishCreated: finishEditableShareCreated,
        resetToShareSlug,
        setCreating: setEditableShareCreating,
        setError: setEditableShareError,
    } = shareMenu;
    const actionBar = useActionBarDrag({
        initialAnchor: () => {
            if (typeof window === "undefined") return "left";

            const storedAnchor = window.localStorage.getItem(
                getActionBarStorageKey(id)
            );

            return isActionBarAnchor(storedAnchor) ? storedAnchor : "left";
        },
        onAnchorChange: (nextAnchor) => {
            window.localStorage.setItem(getActionBarStorageKey(id), nextAnchor);
        },
    });
    const [gameMetadata, setGameMetadata] = useState({
        blackPlayerName: null as string | null,
        whitePlayerName: null as string | null,
        handicap: 0,
        komi: 0,
    });
    const [gameState, setGameState] = useState<GameState>({
        setupStones: [],
        moves: [],
        currentPlayer: "B",
    });
    const {
        boardAreaRef,
        gobanWrapperRef,
        gridMetrics,
        setGridMetrics,
        vertexSize,
    } = useBoardGeometry({
        boardSize: size,
        measureGrid: true,
        showCoordinates: showBoardCoordinates,
    });

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

    useEffect(() => {
        const loadGame = () => {
            const gameRecord = getLocalGame(id);

            if (!gameRecord) {
                setLoadError(t("gameNotFound"));
                return;
            }

            const loadedGame = createLoadedLocalGame(gameRecord);

            localGameRecordRef.current = gameRecord;
            hasExistingShareRef.current = Boolean(gameRecord.lastShareSlug);
            resetToShareSlug(gameRecord.lastShareSlug ?? null);
            setSize(loadedGame.size);
            setGameState(loadedGame.gameState);
            setUpdatedAt(loadedGame.updatedAt);
            setGameMetadata({
                blackPlayerName: loadedGame.metadata.blackPlayerName,
                whitePlayerName: loadedGame.metadata.whitePlayerName,
                handicap: loadedGame.metadata.handicap,
                komi: loadedGame.metadata.komi,
            });
            lastSavedSnapshotRef.current = loadedGame.snapshot;
            setHasUnsavedChanges(false);
            setLoadError(null);
            hasLoadedGameRef.current = true;
        };

        loadGame();
    }, [id, resetToShareSlug]);

    useEffect(() => {
        if (!hasLoadedGameRef.current) return;
        if (!updatedAt) return;
        if (!hasUnsavedChanges) return;

        const currentSnapshot = createGameSnapshot(size, gameState);

        if (
            !shouldAutosave({
                hasLoadedGame: hasLoadedGameRef.current,
                updatedAt,
                hasUnsavedChanges,
                currentSnapshot,
                lastSavedSnapshot: lastSavedSnapshotRef.current,
            })
        ) {
            setHasUnsavedChanges(false);
            return;
        }

        const timeoutId = window.setTimeout(() => {
            try {
                const localGameRecord = localGameRecordRef.current;

                if (!localGameRecord) {
                    console.error(
                        "Failed to save game: local game record was not loaded"
                    );
                    return;
                }

                const savedGame = saveLocalEditableRecord({
                    boardSize: size,
                    gameState,
                    record: localGameRecord,
                });

                localGameRecordRef.current = savedGame;
                setUpdatedAt(savedGame.updatedAt);
                lastSavedSnapshotRef.current = currentSnapshot;
                setHasUnsavedChanges(false);
            } catch (error) {
                console.error("Failed to save game", error);
            }
        }, 500);

        return () => window.clearTimeout(timeoutId);
    }, [id, updatedAt, hasUnsavedChanges, size, gameState]);

    const replay = replayGame({
        boardSize: size,
        setupStones: gameState.setupStones,
        moves: gameState.moves,
    });
    const board = replay.board;
    const signMap = board.signMap;

    const markerMap: StoneCorrectionMarker[][] = Array.from(
        { length: size },
        () => Array.from({ length: size }, () => null as StoneCorrectionMarker)
    );

    const lastMove = gameState.moves.at(-1);

    if (lastMove?.type === "play") {
        markerMap[lastMove.y][lastMove.x] = { type: "circle" };
    }

    const clearCachedShareLink = useCallback(() => {
        clearShareLink();

        const localGameRecord = localGameRecordRef.current;
        if (!localGameRecord) return;

        localGameRecordRef.current = {
            ...localGameRecord,
            lastShareSlug: null,
        };
    }, [clearShareLink]);

    const guardEdit = useCallback((fn: () => void) => {
        if (hasExistingShareRef.current) {
            setPendingEditFn(() => fn);
        } else {
            fn();
        }
    }, []);

    const playMove = (x: number, y: number) => {
        guardEdit(() => {
            const result = playGameMove({
                board,
                gameState,
                x,
                y,
            });

            if (!result.ok) return;

            clearCachedShareLink();
            setGameState(result.gameState);
            setHasUnsavedChanges(true);
        });
    };

    const canShareGame = gameState.moves.some((move) => move.type === "play");

    const measureGeometry = (): BoardGridGeometry | null => {
        const gobanWrapper = gobanWrapperRef.current;
        if (!gobanWrapper) return null;

        const metrics = getLiveBoardGridMetrics({
            boardSize: size,
            gobanWrapper,
        });
        if (!metrics) return null;

        setGridMetrics(metrics.gridMetrics);
        return metrics.gridGeometry;
    };

    const geometry: StoneCorrectionGeometry = {
        gridMetrics,
        measure: measureGeometry,
        getContainerHeight: () => boardAreaRef.current?.clientHeight ?? Infinity,
        vertexFromPointer: ({ clientX, clientY, geometry: grid }) =>
            getVertexFromBoardPointer({ clientX, clientY, grid }),
        createDragState: ({ geometry: grid, origin, pointerId, pointerX, pointerY }) =>
            createStoneSelectionDragState({
                grid,
                origin,
                pointerId,
                pointerX,
                pointerY,
            }),
        dragVertexFromPointer: ({ clientX, clientY, dragState, geometry: grid }) =>
            getStoneSelectionDragVertexFromPointer({
                clientX,
                clientY,
                dragState,
                grid,
            }),
        zoom: {
            enabled: twoStepPlacement,
            window: (vertex) => {
                const grid = measureGeometry();
                if (!grid) return null;
                if (!shouldUsePlacementZoom({ cellSize: grid.cellSize })) {
                    return null;
                }

                return getPlacementZoomWindow({ boardSize: size, vertex });
            },
            vertexFromPointer: ({ clientX, clientY, geometry: grid, zoomWindow }) =>
                getVertexFromPlacementZoomPointer({
                    clientX,
                    clientY,
                    grid,
                    zoomWindow,
                }),
        },
    };

    const adapter: StoneCorrectionAdapter = {
        getEditableItemIdAtVertex: (vertex) =>
            getEditableMoveIndexAtVertex({
                moves: gameState.moves,
                vertex,
                visibleStoneOwners: replay.visibleStoneOwners,
            }),
        getSelectedItemVertices: (ids) =>
            getSelectedMoveVertices({
                gameState,
                selectedMoveIndexes: ids,
            }),
        getOrigin: (ids, from) =>
            getStoneCorrectionOrigin({
                from,
                gameState,
                selectedMoveIndexes: ids,
            }),
        buildDragPreview: ({ ids, origin, target }) => {
            if (
                !isRecorderCorrectionLegal({
                    boardSize: size,
                    from: origin,
                    gameState,
                    selectedMoveIndexes: ids,
                    vertex: target,
                })
            ) {
                return null;
            }

            const previewSignMap = cloneSignMap(signMap);
            const previewVertices: [number, number][] = [];
            const dx = target.x - origin.x;
            const dy = target.y - origin.y;

            type PlayMoveWithNext = {
                move: { type: "play"; x: number; y: number; color: Stone };
                nextX: number;
                nextY: number;
            };
            const playMoves: PlayMoveWithNext[] = [];

            for (const moveIndex of ids) {
                const move = gameState.moves[moveIndex];

                if (move?.type !== "play") continue;

                const nextX = move.x + dx;
                const nextY = move.y + dy;

                if (nextX < 0 || nextX >= size || nextY < 0 || nextY >= size) {
                    return null;
                }

                playMoves.push({ move, nextX, nextY });
            }

            for (const { move } of playMoves) {
                previewSignMap[move.y][move.x] = 0;
            }

            for (const { move, nextX, nextY } of playMoves) {
                previewSignMap[nextY][nextX] = stoneToSign(move.color);
                previewVertices.push([nextX, nextY]);
            }

            return {
                signMap: previewSignMap,
                selectedVertices: previewVertices,
            };
        },
        getDragHiddenMarkerVertex: (ids) => {
            if (gameState.moves.length === 0) return null;
            const lastIndex = gameState.moves.length - 1;
            if (!ids.includes(lastIndex)) return null;

            const lastPlayedMove = gameState.moves.at(-1);
            if (lastPlayedMove?.type !== "play") return null;

            return { x: lastPlayedMove.x, y: lastPlayedMove.y };
        },
        applyMove: ({ ids, target, from }) => {
            const result = applyRecorderCorrection({
                boardSize: size,
                from,
                gameState,
                selectedMoveIndexes: ids,
                vertex: target,
            });

            if (!result.ok) {
                return {
                    ok: false as const,
                    error: formatMoveEditError(result.error),
                };
            }

            if (hasExistingShareRef.current) {
                setPendingEditFn(() => () => {
                    clearCachedShareLink();
                    setGameState(result.gameState);
                    setHasUnsavedChanges(true);
                });
                return { ok: false as const, error: "" };
            }

            clearCachedShareLink();
            setGameState(result.gameState);
            setHasUnsavedChanges(true);

            return {
                ok: true as const,
                selectedIds: result.selectedMoveIndexes,
                status: result.status,
            };
        },
        placeAt: (vertex) => playMove(vertex.x, vertex.y),
    };

    const correction = useStoneCorrection({
        boardSize: size,
        signMap,
        baseMarkerMap: markerMap,
        vertexSize,
        showCoordinates: showBoardCoordinates,
        placementPreviewColor: gameState.currentPlayer,
        geometry,
        adapter,
        onStatus: setShareStatus,
    });

    const handleConfirmEdit = () => {
        hasExistingShareRef.current = false;
        clearCachedShareLink();
        pendingEditFn?.();
        correction.clearSelection();
        setPendingEditFn(null);
    };

    const handleCancelEdit = () => {
        setPendingEditFn(null);
    };

    const createCurrentLocalGameRecord = useCallback(() => {
        const localGameRecord = localGameRecordRef.current;
        if (!localGameRecord) return null;

        return {
            ...localGameRecord,
            boardSize: size,
            gameState,
        };
    }, [gameState, size]);

    const handleUndo = () => {
        if (gameState.moves.length === 0) return;

        guardEdit(() => {
            const previousMoves = gameState.moves.slice(0, -1);
            const lastUndoneMove = gameState.moves.at(-1);

            clearCachedShareLink();
            setGameState({
                ...gameState,
                moves: previousMoves,
                currentPlayer: lastUndoneMove?.color ?? "B",
            });
            correction.clearSelection();
            setHasUnsavedChanges(true);
        });
    };

    const handlePass = () => {
        const newMove: Move = {
            type: "pass",
            color: gameState.currentPlayer,
        };

        guardEdit(() => {
            clearCachedShareLink();
            setGameState({
                ...gameState,
                moves: [...gameState.moves, newMove],
                currentPlayer: gameState.currentPlayer === "B" ? "W" : "B",
            });
            correction.clearSelection();
            setHasUnsavedChanges(true);
        });
    };

    const handleSaveSgfMetadata = useCallback(
        ({
            blackPlayerName,
            whitePlayerName,
            komi,
        }: {
            blackPlayerName: string | null;
            whitePlayerName: string | null;
            komi: number;
        }) => {
            const localGameRecord = localGameRecordRef.current;
            if (!localGameRecord) return;

            guardEdit(() => {
                clearCachedShareLink();

                const updatedRecord = saveLocalEditableRecord({
                    record: localGameRecord,
                    blackPlayerName,
                    whitePlayerName,
                    komi,
                });

                localGameRecordRef.current = updatedRecord;
                setGameMetadata((prev) => ({
                    ...prev,
                    blackPlayerName,
                    whitePlayerName,
                    komi,
                }));
            });
        },
        [clearCachedShareLink, guardEdit]
    );

    const handleDownloadSgf = useCallback(() => {
        downloadSgf({
            boardSize: size,
            moves: gameState.moves,
            setupStones: gameState.setupStones,
            handicap: gameMetadata.handicap,
            komi: gameMetadata.komi,
            blackPlayerName: gameMetadata.blackPlayerName,
            whitePlayerName: gameMetadata.whitePlayerName,
        });
    }, [
        gameMetadata.blackPlayerName,
        gameMetadata.whitePlayerName,
        gameMetadata.handicap,
        gameMetadata.komi,
        gameState.moves,
        gameState.setupStones,
        size,
    ]);

    const handleDownloadSgfFromShareMenu = useCallback(() => {
        handleDownloadSgf();
        closeEditableShareMenu();
    }, [closeEditableShareMenu, handleDownloadSgf]);

    const performShare = useCallback(async () => {
        const currentLocalGame = createCurrentLocalGameRecord();

        if (!currentLocalGame) {
            setEditableShareError(t("gameNotLoaded"));
            return;
        }

        if (!canShareGame) {
            setEditableShareError(t("addMoveBeforeSharing"));
            return;
        }

        setEditableShareCreating(t("creatingShare"));

        try {
            const { slug } = await createShareFromLocalGame({
                localGame: currentLocalGame,
            });

            const updatedLocalGame = saveLocalEditableRecord({
                record: {
                    ...currentLocalGame,
                    lastShareSlug: slug,
                },
            });

            localGameRecordRef.current = updatedLocalGame;
            hasExistingShareRef.current = true;
            finishEditableShareCreated(slug);
        } catch (error) {
            setEditableShareError(
                error instanceof Error ? error.message : t("failedToCreateShare")
            );
        }
    }, [
        canShareGame,
        createCurrentLocalGameRecord,
        finishEditableShareCreated,
        setEditableShareCreating,
        setEditableShareError,
    ]);

    const handleShare = useCallback(async () => {
        if (!hasAcknowledgedSharePrivacy()) {
            setIsSharePrivacyDialogOpen(true);
            return;
        }

        await performShare();
    }, [performShare]);

    const handleConfirmSharePrivacy = useCallback(() => {
        acknowledgeSharePrivacy();
        setIsSharePrivacyDialogOpen(false);
        void performShare();
    }, [performShare]);

    const handleReadSharePrivacyPolicy = useCallback(() => {
        markSharePrivacyResumeContext({ kind: "game", id });
    }, [id]);

    const handleCancelSharePrivacy = useCallback(() => {
        setIsSharePrivacyDialogOpen(false);
    }, []);

    return (
        <div
            className={
                isDarkMode
                    ? "goban-theme-dark relative m-0 flex min-h-0 flex-1 touch-none flex-col overflow-hidden overscroll-none bg-neutral-900 p-0 text-white"
                    : "goban-theme-light relative m-0 flex min-h-0 flex-1 touch-none flex-col overflow-hidden overscroll-none bg-zinc-100 p-0 text-zinc-950"
            }
        >
            {loadError && (
                <div className="flex h-full items-center justify-center p-6 text-center">
                    <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
                        {loadError}
                    </p>
                </div>
            )}

            {!loadError && (
                <div
                    ref={boardAreaRef}
                    className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden overscroll-none p-0"
                >
                    {pendingEditFn ? (
                        <ConfirmDialog
                            titleId="edit-after-share-title"
                            message={t("editAfterShareWarning")}
                            confirmLabel={t("continueEditing")}
                            onCancel={handleCancelEdit}
                            onConfirm={handleConfirmEdit}
                        />
                    ) : null}
                    {shareMenu.isOpen ? (
                        <SgfSharePanel
                            alignToViewportTop={isOverlayHeader}
                            initialActiveTab={
                                shouldResumeSharePrivacy ? "share" : "sgf"
                            }
                            menuRef={shareMenu.menuRef}
                            blackPlayerName={gameMetadata.blackPlayerName}
                            whitePlayerName={gameMetadata.whitePlayerName}
                            komi={gameMetadata.komi}
                            onSaveSgfMetadata={handleSaveSgfMetadata}
                            canShareGame={canShareGame}
                            isCreating={shareMenu.isCreating}
                            message={shareMenu.displayMessage}
                            mode={shareMenu.mode}
                            onCreateShare={() => {
                                void handleShare();
                            }}
                            onDownloadSgf={handleDownloadSgfFromShareMenu}
                            onCopyLink={() => {
                                void shareMenu.copyShareLink();
                            }}
                            qrCodeDataUrl={shareMenu.qrCodeDataUrl}
                            sharePath={shareMenu.sharePath}
                        />
                    ) : null}
                    {isSharePrivacyDialogOpen ? (
                        <SharePrivacyDialog
                            returnToPath={`/games/${id}`}
                            onCancel={handleCancelSharePrivacy}
                            onReadPolicy={handleReadSharePrivacyPolicy}
                            onContinue={handleConfirmSharePrivacy}
                        />
                    ) : null}
                    <RecorderActionBar
                        anchor={actionBar.anchor}
                        canUndo={gameState.moves.length > 0}
                        dragX={actionBar.dragX}
                        hasStoneCorrectionSelection={
                            correction.hasStoneCorrectionSelection
                        }
                        onClosePlacementZoom={correction.handleClosePlacementZoom}
                        onExitStoneEditMode={correction.exitStoneEditMode}
                        onLostPointerCapture={
                            actionBar.dragHandlers.onLostPointerCapture
                        }
                        onPass={handlePass}
                        onPointerCancel={actionBar.dragHandlers.onPointerCancel}
                        onPointerDown={actionBar.dragHandlers.onPointerDown}
                        onPointerMove={actionBar.dragHandlers.onPointerMove}
                        onPointerUp={actionBar.dragHandlers.onPointerUp}
                        onTogglePanel={shareMenu.toggle}
                        onUndo={handleUndo}
                        panelOpen={shareMenu.isOpen}
                        railRef={actionBar.railRef}
                        shareTriggerRef={shareMenu.triggerRef}
                        showPlacementZoomControl={Boolean(
                            correction.placementZoomWindow
                        )}
                    />
                    <div
                        ref={gobanWrapperRef}
                        className="relative"
                        draggable={false}
                        onDragStart={(event) => {
                            event.preventDefault();
                        }}
                        onContextMenu={(event) => {
                            event.preventDefault();
                        }}
                        onPointerDown={correction.onBoardPointerDown}
                        onPointerMove={correction.onBoardPointerMove}
                        onPointerUp={correction.onBoardPointerUp}
                        onPointerCancel={correction.onBoardPointerCancel}
                    >
                        <BoardView
                            vertexSize={vertexSize}
                            signMap={correction.boardSignMap}
                            markerMap={correction.boardMarkerMap}
                            selectedVertices={correction.renderSelectedVertices}
                            dimmedVertices={correction.renderDimmedVertices}
                            showCoordinates={showBoardCoordinates}
                        />
                        {correction.placementZoomWindow ? (
                            <div
                                aria-hidden="true"
                                className={correction.placementZoomClassName}
                                style={{
                                    left:
                                        gridMetrics.left +
                                        correction.placementZoomOffset,
                                    top:
                                        gridMetrics.top +
                                        correction.placementZoomOffset,
                                }}
                            >
                                <BoardView
                                    vertexSize={correction.placementZoomVertexSize}
                                    signMap={correction.boardSignMap}
                                    markerMap={correction.boardMarkerMap}
                                    selectedVertices={
                                        correction.renderSelectedVertices
                                    }
                                    dimmedVertices={correction.renderDimmedVertices}
                                    rangeX={correction.placementZoomRangeX}
                                    rangeY={correction.placementZoomRangeY}
                                    showCoordinates={showBoardCoordinates}
                                />
                            </div>
                        ) : null}
                        {correction.hasStoneCorrectionSelection ? (
                            <div
                                className={
                                    isDarkMode
                                        ? "absolute z-30 inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-950 shadow-lg"
                                        : "absolute z-30 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white shadow-lg"
                                }
                                style={{
                                    left:
                                        correction.stoneCorrectionHandlePosition
                                            ?.left ?? 0,
                                    top:
                                        correction.stoneCorrectionHandlePosition
                                            ?.top ?? 0,
                                    transform:
                                        correction.stoneCorrectionHandlePosition
                                            ?.transform,
                                }}
                            >
                                <button
                                    data-testid="stone-correction-handle"
                                    type="button"
                                    className="inline-flex h-11 w-11 cursor-grab items-center justify-center active:cursor-grabbing"
                                    onPointerDown={
                                        correction.startStoneSelectionHandleDrag
                                    }
                                    onPointerMove={
                                        correction.updateStoneSelectionHandleDrag
                                    }
                                    onPointerUp={
                                        correction.finishStoneSelectionHandleDrag
                                    }
                                    onPointerCancel={
                                        correction.cancelStoneSelectionHandleDrag
                                    }
                                    onLostPointerCapture={
                                        correction.cancelStoneSelectionHandleDrag
                                    }
                                    aria-label={t("moveSelectedStones")}
                                    title={t("moveSelectedStones")}
                                >
                                    <span
                                        aria-hidden="true"
                                        className="grid h-5 w-3.5 grid-cols-2 gap-x-1 gap-y-1 text-zinc-700 dark:text-zinc-200"
                                    >
                                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                    </span>
                                </button>
                            </div>
                        ) : null}
                        {correction.shouldShowTouchGuide &&
                            correction.touchGuideMetrics && (
                                <svg
                                    className="pointer-events-none absolute z-20"
                                    style={{
                                        left: correction.touchGuideMetrics.left,
                                        top: correction.touchGuideMetrics.top,
                                    }}
                                    width={correction.touchGuideMetrics.boardSizePx}
                                    height={
                                        correction.touchGuideMetrics.boardSizePx
                                    }
                                    viewBox={`0 0 ${correction.touchGuideMetrics.boardSizePx} ${correction.touchGuideMetrics.boardSizePx}`}
                                >
                                    <line
                                        x1={0}
                                        y1={
                                            correction.touchGuideMetrics.y *
                                                correction.touchGuideMetrics
                                                    .cellSize +
                                            correction.touchGuideMetrics.cellSize /
                                                2
                                        }
                                        x2={
                                            correction.touchGuideMetrics.boardSizePx
                                        }
                                        y2={
                                            correction.touchGuideMetrics.y *
                                                correction.touchGuideMetrics
                                                    .cellSize +
                                            correction.touchGuideMetrics.cellSize /
                                                2
                                        }
                                        stroke="rgb(56 189 248 / 0.8)"
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                    <line
                                        x1={
                                            correction.touchGuideMetrics.x *
                                                correction.touchGuideMetrics
                                                    .cellSize +
                                            correction.touchGuideMetrics.cellSize /
                                                2
                                        }
                                        y1={0}
                                        x2={
                                            correction.touchGuideMetrics.x *
                                                correction.touchGuideMetrics
                                                    .cellSize +
                                            correction.touchGuideMetrics.cellSize /
                                                2
                                        }
                                        y2={
                                            correction.touchGuideMetrics.boardSizePx
                                        }
                                        stroke="rgb(56 189 248 / 0.8)"
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                </svg>
                            )}
                    </div>
                </div>
            )}
        </div>
    );
}
