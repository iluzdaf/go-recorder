"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type {
    ComponentType,
    PointerEvent as ReactPointerEvent,
} from "react";

import type {
    GameState,
    LocalDraftRecord,
    PositionView,
    SetupStone,
    Stone,
} from "./types";
import BoardStatusMessage from "./BoardStatusMessage";
import DraftBoardActionBar from "./DraftBoardActionBar";
import PositionViewSettingsDialog from "./PositionViewSettingsDialog";
import ShareMenu from "./ShareMenu";
import { downloadSgf } from "./sgf";
import {
    useBoardDisplaySettings,
    useHeaderStatus,
    useHeaderVisibility,
    useTheme,
} from "./AppShell";
import {
    applyBoardDraftStrokeVertex,
    clearDraftShareCache,
    getBoardDraftStrokeMode,
    type BoardDraftStrokeMode,
} from "../lib/boardDraft";
import {
    getLiveBoardGridMetrics,
    getLivePositionViewGridMetrics,
} from "../lib/boardGeometry";
import { canShareDraft, getIllegalBoardGroupVertices } from "../lib/draftSharing";
import { formatMoveEditError, t } from "../lib/i18n";
import { saveLocalEditableRecord } from "../lib/localEditableSave";
import { getLocalRecord } from "../lib/localGames";
import {
    getDefaultPositionView,
    getPositionViewDisplaySize,
    getPositionViewRange,
    getVertexFromPositionViewPointer,
} from "../lib/positionView";
import { createShareFromLocalRecord } from "../lib/shareClient";
import { replayGame } from "../lib/gameReplay";
import {
    applyRecorderCorrection,
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
    createVariationMoveNumberMarkerMap,
    type MoveNumberMarker,
    playVariationDraftMove,
    undoVariationDraftMove,
} from "../lib/variationDraft";
import {
    useStoneCorrection,
    type StoneCorrectionAdapter,
    type StoneCorrectionGeometry,
} from "./useStoneCorrection";
import useActionBarDrag from "./useActionBarDrag";
import useBoardGeometry from "./useBoardGeometry";
import useEditableShareMenuController from "./useEditableShareMenuController";

type DraftMarker = MoveNumberMarker | null | { type: "circle" };

type ShudanGobanProps = {
    vertexSize: number;
    signMap: number[][];
    markerMap: DraftMarker[][];
    showCoordinates: boolean;
    selectedVertices?: [number, number][];
    dimmedVertices?: [number, number][];
    rangeX?: [number, number];
    rangeY?: [number, number];
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

const EMPTY_GAME_STATE: GameState = {
    setupStones: [],
    moves: [],
    currentPlayer: "B",
};

function stoneToSign(stone: Stone) {
    return stone === "B" ? 1 : -1;
}

function cloneSignMap(signMap: number[][]) {
    return signMap.map((row) => [...row]);
}

function buildSignMap(boardSize: number, setupStones: SetupStone[]) {
    const signMap = Array.from({ length: boardSize }, () =>
        Array.from({ length: boardSize }, () => 0)
    );

    for (const setupStone of setupStones) {
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
    const { showBoardCoordinates, twoStepPlacement } = useBoardDisplaySettings();
    const { setHeaderStatus } = useHeaderStatus();
    const { isOverlayHeader } = useHeaderVisibility();
    const [draft, setDraft] = useState<LocalDraftRecord | null>(() =>
        loadLocalBoardDraft(id)
    );
    const draftRef = useRef<LocalDraftRecord | null>(draft);
    const hasPendingSaveRef = useRef(false);
    const positionViewSettingsRef = useRef<HTMLDivElement | null>(null);
    const positionViewSettingsTriggerRef = useRef<HTMLButtonElement | null>(
        null
    );
    const [selectedColor, setSelectedColor] = useState<Stone>("B");
    const [positionViewSettingsOpen, setPositionViewSettingsOpen] =
        useState(false);
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
        toggle: toggleEditableShareMenu,
    } = shareMenu;
    const actionBar = useActionBarDrag();
    const positionView = draft?.positionView ?? null;
    const displayBoardSize = draft
        ? getPositionViewDisplaySize({
              boardSize: draft.boardSize,
              positionView,
          })
        : 19;
    const {
        boardAreaRef,
        gobanWrapperRef,
        gridMetrics,
        setGridMetrics,
        vertexSize,
    } = useBoardGeometry({
        boardSize: displayBoardSize,
        measureGrid: true,
        showCoordinates: showBoardCoordinates,
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

        const positionRange = getPositionViewRange({
            boardSize: draft.boardSize,
            positionView: draft.positionView ?? null,
        });
        const metrics = positionRange
            ? getLivePositionViewGridMetrics({
                  columns: positionRange.columns,
                  gobanWrapper,
                  rows: positionRange.rows,
                  startX: positionRange.startX,
                  startY: positionRange.startY,
              })
            : getLivePositionViewGridMetrics({
                  columns: draft.boardSize,
                  gobanWrapper,
                  rows: draft.boardSize,
                  startX: 0,
                  startY: 0,
              });

        return metrics ? { gridGeometry: metrics } : null;
    }, [draft, gobanWrapperRef]);

    const getVertexFromPointer = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>): Vertex | null => {
            const gobanWrapper = gobanWrapperRef.current;
            if (!gobanWrapper || !draft) return null;

            const metrics = getGridMetrics();
            if (!metrics) return null;

            return getVertexFromPositionViewPointer({
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

    const handleClosePositionViewSettings = useCallback(() => {
        setPositionViewSettingsOpen(false);
    }, []);

    const handleTogglePositionViewSettings = useCallback(() => {
        if (!positionViewSettingsOpen) {
            closeEditableShareMenu();
        }

        setPositionViewSettingsOpen((isOpen) => !isOpen);
    }, [closeEditableShareMenu, positionViewSettingsOpen]);

    const handleToggleShareMenu = useCallback(() => {
        setPositionViewSettingsOpen(false);
        toggleEditableShareMenu();
    }, [toggleEditableShareMenu]);

    useEffect(() => {
        if (!positionViewSettingsOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;

            const dialogElement = positionViewSettingsRef.current;
            const triggerElement = positionViewSettingsTriggerRef.current;

            if (
                dialogElement?.contains(target) ||
                triggerElement?.contains(target)
            ) {
                return;
            }

            handleClosePositionViewSettings();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                handleClosePositionViewSettings();
            }
        };

        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleClosePositionViewSettings, positionViewSettingsOpen]);

    const handleChangePositionViewSettings = useCallback(
        (nextPositionView: PositionView) => {
            const currentDraft = draftRef.current;
            if (!currentDraft || currentDraft.draftKind !== "board") return;

            const currentPositionView =
                currentDraft.positionView ??
                getDefaultPositionView(currentDraft.boardSize);

            if (
                currentPositionView.anchor === nextPositionView.anchor &&
                currentPositionView.rows === nextPositionView.rows &&
                currentPositionView.columns === nextPositionView.columns
            ) {
                return;
            }

            clearCachedShareLink();
            updateDraft(
                clearDraftShareCache({
                    ...currentDraft,
                    positionView: nextPositionView,
                })
            );
        },
        [clearCachedShareLink, updateDraft]
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

        if (currentDraft.draftKind === "board") {
            const illegal = getIllegalBoardGroupVertices(currentDraft);
            if (illegal.length > 0) {
                setEditableShareError(t("illegalGroupsOnBoard"));
                return;
            }
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

            if (savedRecord.recordKind !== "draft") {
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

    // --- Stone correction (variation drafts) ---
    const isVariationDraft = draft?.draftKind === "variation";
    const correctionBoardSize = draft?.boardSize ?? 19;
    const correctionGameState = draft?.gameState ?? EMPTY_GAME_STATE;
    const variationReplay = isVariationDraft
        ? replayGame({
              boardSize: correctionBoardSize,
              setupStones: correctionGameState.setupStones,
              moves: correctionGameState.moves,
          })
        : null;
    const correctionSignMap =
        isVariationDraft && variationReplay
            ? variationReplay.board.signMap
            : buildSignMap(correctionBoardSize, correctionGameState.setupStones);
    const variationMarkerMap: DraftMarker[][] = isVariationDraft
        ? createVariationMoveNumberMarkerMap({
              boardSize: correctionBoardSize,
              moves: correctionGameState.moves,
              signMap: correctionSignMap,
              startMoveIndex: draft?.baseMoveCount ?? 0,
          })
        : Array.from({ length: correctionBoardSize }, () =>
              Array.from<DraftMarker>({ length: correctionBoardSize }).fill(null)
          );
    const variationBaseMoveCount = draft?.baseMoveCount ?? 0;

    const measureFullBoardGeometry =
        useCallback((): BoardGridGeometry | null => {
            const gobanWrapper = gobanWrapperRef.current;
            if (!gobanWrapper) return null;

            const metrics = getLiveBoardGridMetrics({
                boardSize: correctionBoardSize,
                gobanWrapper,
            });
            if (!metrics) return null;

            setGridMetrics(metrics.gridMetrics);
            return metrics.gridGeometry;
        }, [correctionBoardSize, gobanWrapperRef, setGridMetrics]);

    const correctionGeometry: StoneCorrectionGeometry = {
        gridMetrics,
        measure: measureFullBoardGeometry,
        vertexFromPointer: ({ clientX, clientY, geometry: grid }) =>
            getVertexFromBoardPointer({ clientX, clientY, grid }),
        dragVertexFromPointer: ({ clientX, clientY, dragState, geometry: grid }) =>
            getStoneSelectionDragVertexFromPointer({
                clientX,
                clientY,
                dragState,
                grid,
            }),
        zoom: {
            enabled: isVariationDraft && twoStepPlacement,
            window: (vertex) => {
                const grid = measureFullBoardGeometry();
                if (!grid) return null;
                if (!shouldUsePlacementZoom({ cellSize: grid.cellSize })) {
                    return null;
                }

                return getPlacementZoomWindow({
                    boardSize: correctionBoardSize,
                    vertex,
                });
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

    const correctionAdapter: StoneCorrectionAdapter = {
        getEditableItemIdAtVertex: (vertex) => {
            if (!isVariationDraft || !variationReplay) return null;

            const id = getEditableMoveIndexAtVertex({
                moves: correctionGameState.moves,
                vertex,
                visibleStoneOwners: variationReplay.visibleStoneOwners,
            });
            if (id === null) return null;

            // Lock the shared base game; only the variation's own moves edit.
            return id >= variationBaseMoveCount ? id : null;
        },
        getSelectedItemVertices: (ids) =>
            getSelectedMoveVertices({
                gameState: correctionGameState,
                selectedMoveIndexes: ids,
            }),
        getOrigin: (ids, from) =>
            getStoneCorrectionOrigin({
                from,
                gameState: correctionGameState,
                selectedMoveIndexes: ids,
            }),
        buildDragPreview: ({ ids, origin, target }) => {
            if (
                !isRecorderCorrectionLegal({
                    boardSize: correctionBoardSize,
                    from: origin,
                    gameState: correctionGameState,
                    selectedMoveIndexes: ids,
                    vertex: target,
                })
            ) {
                return null;
            }

            const previewSignMap = cloneSignMap(correctionSignMap);
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
                const move = correctionGameState.moves[moveIndex];

                if (move?.type !== "play") continue;

                const nextX = move.x + dx;
                const nextY = move.y + dy;

                if (
                    nextX < 0 ||
                    nextX >= correctionBoardSize ||
                    nextY < 0 ||
                    nextY >= correctionBoardSize
                ) {
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
        getDragHiddenMarkerVertex: () => null,
        applyMove: ({ ids, target, from }) => {
            const currentDraft = draftRef.current;
            if (!currentDraft || currentDraft.draftKind !== "variation") {
                return { ok: false as const, error: t("stoneCorrectionFailed") };
            }

            const result = applyRecorderCorrection({
                boardSize: currentDraft.boardSize,
                from,
                gameState: currentDraft.gameState,
                selectedMoveIndexes: ids,
                vertex: target,
            });

            if (!result.ok) {
                return {
                    ok: false as const,
                    error: formatMoveEditError(result.error),
                };
            }

            clearCachedShareLink();
            updateDraft(
                clearDraftShareCache({
                    ...currentDraft,
                    gameState: result.gameState,
                })
            );

            return {
                ok: true as const,
                selectedIds: result.selectedMoveIndexes,
                status: result.status,
            };
        },
        placeAt: (vertex) => {
            const currentDraft = draftRef.current;
            if (!currentDraft || currentDraft.draftKind !== "variation") return;

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
        },
    };

    const correction = useStoneCorrection<DraftMarker>({
        boardSize: correctionBoardSize,
        signMap: correctionSignMap,
        baseMarkerMap: variationMarkerMap,
        vertexSize,
        showCoordinates: showBoardCoordinates,
        placementPreviewColor: correctionGameState.currentPlayer,
        geometry: correctionGeometry,
        adapter: correctionAdapter,
        onStatus: setShareStatus,
    });

    if (!draft) {
        return (
            <div className="flex h-full items-center justify-center bg-zinc-100 p-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
                {t("gameNotFound")}
            </div>
        );
    }

    const signMap =
        draft.draftKind === "variation"
            ? correction.boardSignMap
            : buildSignMap(draft.boardSize, draft.gameState.setupStones);
    const markerMap =
        draft.draftKind === "variation"
            ? correction.boardMarkerMap
            : Array.from({ length: draft.boardSize }, () =>
                  Array.from<DraftMarker>({ length: draft.boardSize }).fill(null)
              );
    const canUndoVariation =
        draft.draftKind === "variation" &&
        draft.baseMoveCount !== null &&
        draft.gameState.moves.length > draft.baseMoveCount;
    const canShareCurrentDraft = canShareDraft(draft);
    const illegalVertices =
        draft.draftKind === "board"
            ? getIllegalBoardGroupVertices(draft)
            : [];
    const positionRange = getPositionViewRange({
        boardSize: draft.boardSize,
        positionView: draft.positionView ?? null,
    });
    const isVariation = draft.draftKind === "variation";

    return (
        <div
            className={
                isDarkMode
                    ? "draft-board goban-theme-dark relative m-0 flex min-h-0 flex-1 touch-none flex-col overflow-hidden overscroll-none bg-neutral-900 p-0 text-white"
                    : "draft-board goban-theme-light relative m-0 flex min-h-0 flex-1 touch-none flex-col overflow-hidden overscroll-none bg-zinc-100 p-0 text-zinc-950"
            }
        >
            <div
                ref={boardAreaRef}
                className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden overscroll-none p-0"
            >
                {shareMenu.isOpen ? (
                    <ShareMenu
                        alignToViewportTop={isOverlayHeader}
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
                    hasStoneCorrectionSelection={
                        isVariation && correction.hasStoneCorrectionSelection
                    }
                    mode={draft.draftKind}
                    onClosePlacementZoom={correction.handleClosePlacementZoom}
                    onExitStoneEditMode={correction.exitStoneEditMode}
                    onLostPointerCapture={
                        actionBar.dragHandlers.onLostPointerCapture
                    }
                    onPointerCancel={actionBar.dragHandlers.onPointerCancel}
                    onPointerDown={actionBar.dragHandlers.onPointerDown}
                    onPointerMove={actionBar.dragHandlers.onPointerMove}
                    onPointerUp={actionBar.dragHandlers.onPointerUp}
                    onToggleColor={handleToggleColor}
                    onTogglePositionViewSettings={handleTogglePositionViewSettings}
                    onToggleShareMenu={handleToggleShareMenu}
                    onUndo={handleVariationUndo}
                    positionViewSettingsTriggerRef={
                        positionViewSettingsTriggerRef
                    }
                    railRef={actionBar.railRef}
                    selectedColor={selectedColor}
                    shareMenuOpen={shareMenu.isOpen}
                    shareTriggerRef={shareMenu.triggerRef}
                    showPlacementZoomControl={
                        isVariation && Boolean(correction.placementZoomWindow)
                    }
                />
                {positionViewSettingsOpen && draft.draftKind === "board" ? (
                    <PositionViewSettingsDialog
                        alignToViewportTop={isOverlayHeader}
                        boardSize={draft.boardSize}
                        dialogRef={positionViewSettingsRef}
                        onChange={handleChangePositionViewSettings}
                        positionView={draft.positionView ?? null}
                    />
                ) : null}
                <div
                    ref={gobanWrapperRef}
                    className="relative"
                    onPointerCancel={
                        isVariation
                            ? correction.onBoardPointerCancel
                            : finishBoardStroke
                    }
                    onPointerDown={
                        isVariation
                            ? correction.onBoardPointerDown
                            : handleBoardPointerDown
                    }
                    onPointerMove={
                        isVariation
                            ? correction.onBoardPointerMove
                            : handleBoardPointerMove
                    }
                    onPointerUp={
                        isVariation
                            ? correction.onBoardPointerUp
                            : finishBoardStroke
                    }
                >
                    <BoardView
                        vertexSize={vertexSize}
                        signMap={signMap}
                        markerMap={markerMap}
                        selectedVertices={
                            isVariation
                                ? correction.renderSelectedVertices
                                : illegalVertices
                        }
                        dimmedVertices={
                            isVariation
                                ? correction.renderDimmedVertices
                                : undefined
                        }
                        rangeX={positionRange?.rangeX}
                        rangeY={positionRange?.rangeY}
                        showCoordinates={showBoardCoordinates}
                    />
                    {isVariation && correction.placementZoomWindow ? (
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
                                signMap={signMap}
                                markerMap={markerMap}
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
                    {isVariation && correction.hasStoneCorrectionSelection ? (
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
                    {isVariation &&
                        correction.shouldShowTouchGuide &&
                        correction.touchGuideMetrics && (
                            <svg
                                className="pointer-events-none absolute z-20"
                                style={{
                                    left: correction.touchGuideMetrics.left,
                                    top: correction.touchGuideMetrics.top,
                                }}
                                width={correction.touchGuideMetrics.boardSizePx}
                                height={correction.touchGuideMetrics.boardSizePx}
                                viewBox={`0 0 ${correction.touchGuideMetrics.boardSizePx} ${correction.touchGuideMetrics.boardSizePx}`}
                            >
                                <line
                                    x1={0}
                                    y1={
                                        correction.touchGuideMetrics.y *
                                            correction.touchGuideMetrics
                                                .cellSize +
                                        correction.touchGuideMetrics.cellSize / 2
                                    }
                                    x2={correction.touchGuideMetrics.boardSizePx}
                                    y2={
                                        correction.touchGuideMetrics.y *
                                            correction.touchGuideMetrics
                                                .cellSize +
                                        correction.touchGuideMetrics.cellSize / 2
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
                                        correction.touchGuideMetrics.cellSize / 2
                                    }
                                    y1={0}
                                    x2={
                                        correction.touchGuideMetrics.x *
                                            correction.touchGuideMetrics
                                                .cellSize +
                                        correction.touchGuideMetrics.cellSize / 2
                                    }
                                    y2={correction.touchGuideMetrics.boardSizePx}
                                    stroke="rgb(56 189 248 / 0.8)"
                                    strokeWidth="1"
                                    vectorEffect="non-scaling-stroke"
                                />
                            </svg>
                        )}
                </div>
            </div>
        </div>
    );
}
