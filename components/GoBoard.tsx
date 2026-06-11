"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type { ComponentType, PointerEvent as ReactPointerEvent } from "react";

import type {
    BoardSize,
    GameState,
    LocalGameRecord,
    Move,
    Stone,
} from "./types";
import { downloadSgf } from "./sgf";
import {
    createGameSnapshot,
    shouldAutosave,
} from "../lib/gameLogic";
import { getLocalGame } from "../lib/localGames";
import { saveLocalEditableRecord } from "../lib/localEditableSave";
import { createLoadedLocalGame } from "../lib/localGameView";
import { createShareFromLocalGame } from "../lib/shareClient";
import { formatMoveEditError, t } from "../lib/i18n";
import { useHeaderStatus, useHeaderVisibility, useTheme } from "./AppShell";
import BoardStatusMessage from "./BoardStatusMessage";
import RecorderActionBar from "./RecorderActionBar";
import ShareMenu from "./ShareMenu";
import useActionBarDrag from "./useActionBarDrag";
import useBoardGeometry from "./useBoardGeometry";
import useEditableShareMenuController from "./useEditableShareMenuController";
import { playGameMove, replayGame } from "../lib/gameReplay";
import { isActionBarAnchor } from "../lib/actionBarDrag";
import { getLiveBoardGridMetrics } from "../lib/boardGeometry";
import {
    applyRecorderCorrection,
    createStoneSelectionDragState,
    didPointerLeaveHoldVertex,
    getCorrectionTapAction,
    getEditableMoveIndexAtVertex,
    getPlacementZoomWindow,
    getVertexFromPlacementZoomPointer,
    getSelectedMoveVertices,
    getStoneCorrectionHandleAnchor,
    getStoneCorrectionHandlePosition,
    getStoneCorrectionOrigin,
    getStoneSelectionDragVertexFromPointer,
    getVertexFromBoardPointer,
    isRecorderCorrectionLegal,
    isStoneSelectionDragActive,
    shouldShowCorrectionTouchGuide,
    shouldShowOriginalSelectedStones,
    shouldShowPlacementPreview,
    shouldStartStoneSelectionHold,
    shouldUsePlacementZoom,
    toggleCorrectionSelection,
    visitCorrectionSelectionDragMove,
    type BoardAreaZoomWindow,
    type StoneSelectionDragState,
    type Vertex,
} from "../lib/gameCorrectionUi";

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

type TouchPreview = {
    x: number;
    y: number;
    screenX: number;
    screenY: number;
} | null;

type GoBoardProps = {
    id: string;
};

function stoneToSign(stone: Stone) {
    return stone === "B" ? 1 : -1;
}

function cloneSignMap(signMap: number[][]) {
    return signMap.map((row) => [...row]);
}

const STONE_SELECT_HOLD_MS = 450;
const STONE_CORRECTION_PILL_GAP_PX = 8;
const ACTION_BAR_STORAGE_KEY_PREFIX = "go-recorder:game-action-bar-anchor:";

function getActionBarStorageKey(id: string) {
    return `${ACTION_BAR_STORAGE_KEY_PREFIX}${id}`;
}

export default function GoBoard({ id }: GoBoardProps) {
    const [size, setSize] = useState<BoardSize>(19);
    const { isDarkMode } = useTheme();
    const { setHeaderStatus } = useHeaderStatus();
    const { isOverlayHeader } = useHeaderVisibility();
    const hasLoadedGameRef = useRef(false);
    const stoneSelectTimeoutRef = useRef<number | null>(null);
    const stoneSelectOriginRef = useRef<Vertex | null>(null);
    const selectedGroupDragOriginRef = useRef<Vertex | null>(null);
    const stoneSelectionDragStateRef = useRef<StoneSelectionDragState | null>(
        null
    );
    const stoneSelectionDragStartMoveIndexRef = useRef<number | null>(null);
    const stoneSelectionDragVisitedMoveIndexesRef = useRef<Set<number>>(
        new Set()
    );
    const didSelectStoneByHoldRef = useRef(false);
    const didDragStoneSelectionRef = useRef(false);
    const [didStartStoneSelectionDrag, setDidStartStoneSelectionDrag] =
        useState(false);
    const [isCorrectionDragActive, setIsCorrectionDragActive] =
        useState(false);
    const lastSavedSnapshotRef = useRef("");
    const localGameRecordRef = useRef<LocalGameRecord | null>(null);
    const [touchPreview, setTouchPreview] = useState<TouchPreview>(null);
    const [placementZoomWindow, setPlacementZoomWindow] =
        useState<BoardAreaZoomWindow | null>(null);
    const [selectedGroupDragOrigin, setSelectedGroupDragOriginState] =
        useState<Vertex | null>(null);
    const [selectedMoveIndexes, setSelectedMoveIndexes] = useState<number[]>([]);
    const selectedMoveIndexesRef = useRef<number[]>([]);
    const touchPreviewVertexRef = useRef<Vertex | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [shareStatus, setShareStatus] = useState<string | null>(null);
    const dismissShareStatus = useCallback(() => setShareStatus(null), []);
    const shareMenu = useEditableShareMenuController({
        onStatus: setShareStatus,
    });
    const {
        canAutoCreateNow,
        clearShareLink,
        close: closeEditableShareMenu,
        finishCreated: finishEditableShareCreated,
        markAutoCreateAttempted,
        resetToShareSlug,
        setCreating: setEditableShareCreating,
        setError: setEditableShareError,
    } = shareMenu;
    const isStonePlacementActiveRef = useRef(false);
    const stonePlacementCanCommitRef = useRef(false);
    const isPendingPlacementZoomRef = useRef(false);
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
    });

    useEffect(() => {
        selectedMoveIndexesRef.current = selectedMoveIndexes;
    }, [selectedMoveIndexes]);

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
            resetToShareSlug(gameRecord.lastShareSlug ?? null);
            setSize(loadedGame.size);
            setGameState(loadedGame.gameState);
            setUpdatedAt(loadedGame.updatedAt);
            setGameMetadata(loadedGame.metadata);
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
                    console.error("Failed to save game: local game record was not loaded");
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

    type Marker = null | { type: "circle" };

    const markerMap: Marker[][] = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => null)
    );

    const lastMove = gameState.moves.at(-1);

    if (lastMove?.type === "play") {
        markerMap[lastMove.y][lastMove.x] = { type: "circle" };
    }

    const selectedMoveVertices = getSelectedMoveVertices({
        gameState,
        selectedMoveIndexes,
    });
    const selectedVertices = selectedMoveVertices.map(({ x, y }) => [x, y] as [number, number]);
    const dragOrigin = getStoneCorrectionOrigin({
        from: selectedGroupDragOrigin,
        gameState,
        selectedMoveIndexes,
    });
    const dragPreview = touchPreview
        ? (() => {
              if (!dragOrigin) return null;
              if (!didStartStoneSelectionDrag) return null;

              const previewSignMap = cloneSignMap(signMap);
              const previewVertices: [number, number][] = [];
              const dx = touchPreview.x - dragOrigin.x;
              const dy = touchPreview.y - dragOrigin.y;

              if (
                  !isRecorderCorrectionLegal({
                      boardSize: size,
                      from: dragOrigin,
                      gameState,
                      selectedMoveIndexes,
                      vertex: touchPreview,
                  })
              ) {
                  return null;
              }

              type PlayMoveWithNext = {
                  move: { type: "play"; x: number; y: number; color: Stone };
                  nextX: number;
                  nextY: number;
              };
              const playMoves: PlayMoveWithNext[] = [];

              for (const moveIndex of selectedMoveIndexes) {
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
          })()
        : null;
    const isMovingSelectedStones = isStoneSelectionDragActive({
        hasTouchPreview: Boolean(touchPreview),
        selectedMoveIndexes,
        didStartStoneSelectionDrag,
    });
    const hasValidDragPreview = Boolean(dragPreview);
    const isDeselectingLastStone =
        isCorrectionDragActive && selectedMoveIndexes.length === 0;
    const renderSelectedVertices = shouldShowOriginalSelectedStones({
        isMovingSelectedStones,
        hasValidDragPreview,
    })
        ? selectedVertices
        : [];
    const renderDimmedVertices = dragPreview ? dragPreview.selectedVertices : [];
    const shouldShowTouchGuide = shouldShowCorrectionTouchGuide({
        hasTouchPreview: Boolean(touchPreview),
        isMovingSelectedStones,
        hasValidDragPreview,
        isDeselectingLastStone,
    });
    const placementPreviewSignMap =
        shouldShowPlacementPreview({
            hasTouchPreview: Boolean(touchPreview),
            hasSelectedStone: selectedMoveIndexes.length > 0,
            isCorrectionDragActive,
        }) && touchPreview
            ? (() => {
                  if (signMap[touchPreview.y]?.[touchPreview.x] !== 0) return null;

                  const preview = cloneSignMap(signMap);
                  preview[touchPreview.y][touchPreview.x] = stoneToSign(
                      gameState.currentPlayer
                  );
                  return preview;
              })()
            : null;
    const boardSignMap = dragPreview?.signMap ?? placementPreviewSignMap ?? signMap;
    const boardMarkerMap =
        isMovingSelectedStones &&
        hasValidDragPreview &&
        gameState.moves.length > 0 &&
        selectedMoveIndexes.includes(gameState.moves.length - 1)
            ? (() => {
                  const nextMarkerMap = markerMap.map((row) => [...row]);
                  const lastMove = gameState.moves.at(-1);

                  if (lastMove?.type === "play") {
                      nextMarkerMap[lastMove.y][lastMove.x] = null;
                  }

                  return nextMarkerMap;
            })()
            : markerMap;
    const stoneCorrectionHandleVertices = dragPreview
        ? dragPreview.selectedVertices.map(([x, y]) => ({ x, y }))
        : selectedMoveVertices;
    const stoneCorrectionAnchorVertex = getStoneCorrectionHandleAnchor(
        stoneCorrectionHandleVertices
    );
    const stoneCorrectionHandlePosition = getStoneCorrectionHandlePosition({
        anchor: stoneCorrectionAnchorVertex,
        gapPx: STONE_CORRECTION_PILL_GAP_PX,
        grid: gridMetrics,
    });
    const hasStoneCorrectionSelection = Boolean(stoneCorrectionHandlePosition);
    const placementZoomVertexSize = placementZoomWindow
        ? gridMetrics.boardSizePx / placementZoomWindow.size
        : vertexSize;
    const placementZoomRangeX: [number, number] | undefined = placementZoomWindow
        ? [
              placementZoomWindow.startX,
              placementZoomWindow.startX + placementZoomWindow.size - 1,
          ]
        : undefined;
    const placementZoomRangeY: [number, number] | undefined = placementZoomWindow
        ? [
              placementZoomWindow.startY,
              placementZoomWindow.startY + placementZoomWindow.size - 1,
          ]
        : undefined;
    const placementZoomClassName = placementZoomWindow
        ? [
              "goban-placement-zoom pointer-events-none absolute z-10",
              placementZoomWindow.startY > 0
                  ? "goban-placement-zoom-hide-top"
                  : "",
              placementZoomWindow.startX + placementZoomWindow.size < size
                  ? "goban-placement-zoom-hide-right"
                  : "",
              placementZoomWindow.startY + placementZoomWindow.size < size
                  ? "goban-placement-zoom-hide-bottom"
                  : "",
              placementZoomWindow.startX > 0
                  ? "goban-placement-zoom-hide-left"
                  : "",
          ]
              .filter(Boolean)
              .join(" ")
        : "";
    const touchGuideMetrics =
        touchPreview && placementZoomWindow
            ? {
                  left: gridMetrics.left,
                  top: gridMetrics.top,
                  cellSize: placementZoomVertexSize,
                  boardSizePx: gridMetrics.boardSizePx,
                  x: touchPreview.x - placementZoomWindow.startX,
                  y: touchPreview.y - placementZoomWindow.startY,
              }
            : touchPreview
              ? {
                    left: gridMetrics.left,
                    top: gridMetrics.top,
                    cellSize: gridMetrics.cellSize,
                    boardSizePx: gridMetrics.boardSizePx,
                    x: touchPreview.x,
                    y: touchPreview.y,
                }
              : null;

    const getGridMetrics = () => {
        const gobanWrapper = gobanWrapperRef.current;
        if (!gobanWrapper) return null;

        const metrics = getLiveBoardGridMetrics({
            boardSize: size,
            gobanWrapper,
        });
        if (!metrics) return null;

        setGridMetrics(metrics.gridMetrics);
        return { gridGeometry: metrics.gridGeometry };
    };

    const getFullBoardVertexFromPointer = (clientX: number, clientY: number) => {
        const metrics = getGridMetrics();
        if (!metrics) return null;

        return getVertexFromBoardPointer({
            clientX,
            clientY,
            grid: metrics.gridGeometry,
        });
    };

    const getZoomedPlacementVertexFromPointer = (
        clientX: number,
        clientY: number
    ) => {
        if (!placementZoomWindow) return null;

        const metrics = getGridMetrics();
        if (!metrics) return null;

        return getVertexFromPlacementZoomPointer({
            clientX,
            clientY,
            grid: metrics.gridGeometry,
            zoomWindow: placementZoomWindow,
        });
    };

    const getPlacementVertexFromPointer = (clientX: number, clientY: number) => {
        if (placementZoomWindow) {
            return getZoomedPlacementVertexFromPointer(clientX, clientY);
        }

        return getFullBoardVertexFromPointer(clientX, clientY);
    };

    const getEnabledPlacementZoomWindow = (vertex: Vertex) => {
        const metrics = getGridMetrics();
        if (!metrics) return null;
        if (
            !shouldUsePlacementZoom({
                cellSize: metrics.gridGeometry.cellSize,
            })
        ) {
            return null;
        }

        return getPlacementZoomWindow({
            boardSize: size,
            vertex,
        });
    };

    const clearStoneSelectTimeout = () => {
        if (stoneSelectTimeoutRef.current !== null) {
            window.clearTimeout(stoneSelectTimeoutRef.current);
        }
        stoneSelectTimeoutRef.current = null;
        stoneSelectOriginRef.current = null;
    };

    const clearPlacementZoom = () => {
        isPendingPlacementZoomRef.current = false;
        setPlacementZoomWindow(null);
    };

    const clearStoneSelectionDragState = () => {
        didSelectStoneByHoldRef.current = false;
        setDidStartStoneSelectionDrag(false);
        setIsCorrectionDragActive(false);
        didDragStoneSelectionRef.current = false;
        stoneSelectOriginRef.current = null;
        selectedGroupDragOriginRef.current = null;
        setSelectedGroupDragOriginState(null);
        stoneSelectionDragStateRef.current = null;
        stoneSelectionDragStartMoveIndexRef.current = null;
        stoneSelectionDragVisitedMoveIndexesRef.current.clear();
        touchPreviewVertexRef.current = null;
    };

    const toggleSelectedMoveIndex = (moveIndex: number) => {
        setSelectedMoveIndexes((current) => {
            const nextSelection = toggleCorrectionSelection({
                moveIndex,
                selectedMoveIndexes: current,
            });
            selectedMoveIndexesRef.current = nextSelection;
            if (nextSelection.length === 0) {
                setSelectedGroupDragOrigin(null);
            }
            return nextSelection;
        });
        setShareStatus(null);
    };

    const visitStoneSelectionDragMove = (moveIndex: number | null) => {
        const result = visitCorrectionSelectionDragMove({
            moveIndex,
            selectedMoveIndexes: selectedMoveIndexesRef.current,
            visitedMoveIndexes: stoneSelectionDragVisitedMoveIndexesRef.current,
        });

        if (!result.didToggle) return;

        stoneSelectionDragVisitedMoveIndexesRef.current =
            result.visitedMoveIndexes;
        selectedMoveIndexesRef.current = result.selectedMoveIndexes;
        setSelectedMoveIndexes(result.selectedMoveIndexes);
        if (result.selectedMoveIndexes.length === 0) {
            setSelectedGroupDragOrigin(null);
        }
        setShareStatus(null);
    };

    const getDragPreviewFromPointer = ({
        clientX,
        clientY,
        dragState,
    }: {
        clientX: number;
        clientY: number;
        dragState: StoneSelectionDragState;
    }) => {
        const metrics = getGridMetrics();
        if (!metrics) return null;

        return getStoneSelectionDragVertexFromPointer({
            clientX,
            clientY,
            dragState,
            grid: metrics.gridGeometry,
        });
    };

    const startStoneSelectionHandleDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (selectedMoveIndexesRef.current.length === 0) return;

        const origin = getStoneCorrectionOrigin({
            gameState,
            selectedMoveIndexes: selectedMoveIndexesRef.current,
        });

        if (!origin) return;

        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);

        const metrics = getGridMetrics();
        if (!metrics) return;

        stoneSelectionDragStateRef.current = createStoneSelectionDragState({
            grid: metrics.gridGeometry,
            pointerId: event.pointerId,
            origin,
            pointerX: event.clientX,
            pointerY: event.clientY,
        });
        selectedGroupDragOriginRef.current = origin;
        setSelectedGroupDragOriginState(origin);
        setDidStartStoneSelectionDrag(true);
        setIsCorrectionDragActive(true);
        touchPreviewVertexRef.current = origin;
        setTouchPreview({
            ...origin,
            screenX: event.clientX,
            screenY: event.clientY,
        });
    };

    const updateStoneSelectionHandleDrag = (
        event: ReactPointerEvent<HTMLButtonElement>
    ) => {
        const dragState = stoneSelectionDragStateRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) return;

        event.preventDefault();
        event.stopPropagation();

        const vertex = getDragPreviewFromPointer({
            clientX: event.clientX,
            clientY: event.clientY,
            dragState,
        });

        if (!vertex) {
            touchPreviewVertexRef.current = null;
            setTouchPreview(null);
            return;
        }

        touchPreviewVertexRef.current = vertex;
        setTouchPreview({
            ...vertex,
            screenX: event.clientX,
            screenY: event.clientY,
        });
    };

    const finishStoneSelectionHandleDrag = (
        event: ReactPointerEvent<HTMLButtonElement>
    ) => {
        const dragState = stoneSelectionDragStateRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) return;

        event.preventDefault();
        event.stopPropagation();

        const pointerVertex =
            getDragPreviewFromPointer({
                clientX: event.clientX,
                clientY: event.clientY,
                dragState,
            }) ?? touchPreviewVertexRef.current;
        const origin = dragState.origin;
        const shouldCommit = didStartStoneSelectionDrag && pointerVertex !== null;

        if (shouldCommit && origin !== null) {
            correctMoves(
                selectedMoveIndexesRef.current,
                pointerVertex,
                origin
            );
        }

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        clearStoneSelectionDragState();
        setTouchPreview(null);
    };

    const cancelStoneSelectionHandleDrag = (
        event: ReactPointerEvent<HTMLButtonElement>
    ) => {
        const dragState = stoneSelectionDragStateRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) return;

        event.preventDefault();
        event.stopPropagation();

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        clearStoneSelectionDragState();
        setTouchPreview(null);
    };

    const setSelectedGroupDragOrigin = (vertex: Vertex | null) => {
        selectedGroupDragOriginRef.current = vertex;
        setSelectedGroupDragOriginState(vertex);
    };

    const handleExitStoneEditMode = () => {
        clearStoneSelectTimeout();
        clearStoneSelectionDragState();
        selectedGroupDragOriginRef.current = null;
        selectedMoveIndexesRef.current = [];
        setSelectedGroupDragOrigin(null);
        setSelectedMoveIndexes([]);
        setTouchPreview(null);
    };

    const playMove = (x: number, y: number) => {
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
    };

    const correctMoves = (moveIndexes: number[], vertex: Vertex, from?: Vertex) => {
        const result = applyRecorderCorrection({
            boardSize: size,
            from,
            gameState,
            selectedMoveIndexes: moveIndexes,
            vertex,
        });

        if (!result.ok) {
            setShareStatus(formatMoveEditError(result.error));
            return true;
        }

        clearCachedShareLink();

        selectedMoveIndexesRef.current = result.selectedMoveIndexes;
        setGameState(result.gameState);
        setSelectedMoveIndexes(result.selectedMoveIndexes);
        setShareStatus(result.status);
        setHasUnsavedChanges(result.hasUnsavedChanges);
        return true;
    };

    const updateTouchPreview = (clientX: number, clientY: number) => {
        const vertex = getPlacementVertexFromPointer(clientX, clientY);
        if (!vertex) {
            stonePlacementCanCommitRef.current = false;
            touchPreviewVertexRef.current = null;
            setTouchPreview(null);
            return null;
        }

        touchPreviewVertexRef.current = vertex;
        setTouchPreview({
            ...vertex,
            screenX: clientX,
            screenY: clientY,
        });
        return vertex;
    };

    const canShareGame = gameState.moves.some((move) => move.type === "play");

    const clearCachedShareLink = () => {
        clearShareLink();

        const localGameRecord = localGameRecordRef.current;
        if (!localGameRecord) return;

        localGameRecordRef.current = {
            ...localGameRecord,
            lastShareSlug: null,
        };
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

        clearCachedShareLink();

        const previousMoves = gameState.moves.slice(0, -1);
        const lastMove = gameState.moves.at(-1);

        setGameState({
            ...gameState,
            moves: previousMoves,
            currentPlayer: lastMove?.color ?? "B",
        });
        setSelectedMoveIndexes([]);
        setHasUnsavedChanges(true);
    };

    const handlePass = () => {
        const newMove: Move = {
            type: "pass",
            color: gameState.currentPlayer,
        };

        clearCachedShareLink();

        setGameState({
            ...gameState,
            moves: [...gameState.moves, newMove],
            currentPlayer: gameState.currentPlayer === "B" ? "W" : "B",
        });
        setSelectedMoveIndexes([]);
        setHasUnsavedChanges(true);
    };

    const handleDownloadSgf = useCallback(() => {
        downloadSgf({
            boardSize: size,
            moves: gameState.moves,
            setupStones: gameState.setupStones,
            handicap: gameMetadata.handicap,
            blackPlayerName: gameMetadata.blackPlayerName,
            whitePlayerName: gameMetadata.whitePlayerName,
        });
    }, [gameMetadata.blackPlayerName, gameMetadata.whitePlayerName, gameMetadata.handicap, gameState.moves, gameState.setupStones, size]);

    const handleDownloadSgfFromShareMenu = useCallback(() => {
        handleDownloadSgf();
        closeEditableShareMenu();
    }, [closeEditableShareMenu, handleDownloadSgf]);

    const handleShare = useCallback(async () => {
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

    useEffect(() => {
        if (!canShareGame || !canAutoCreateNow) {
            return;
        }

        markAutoCreateAttempted();
        void handleShare();
    }, [canAutoCreateNow, canShareGame, handleShare, markAutoCreateAttempted]);

    const handleClosePlacementZoom = useCallback(() => {
        clearPlacementZoom();
        setTouchPreview(null);
    }, []);

    useEffect(() => {
        return () => {
            clearStoneSelectTimeout();
        };
    }, []);

    return (
        <div
            className={
                isDarkMode
                    ? "goban-theme-dark relative m-0 flex h-full touch-none flex-col overflow-hidden overscroll-none bg-neutral-900 p-0 text-white"
                    : "goban-theme-light relative m-0 flex h-full touch-none flex-col overflow-hidden overscroll-none bg-zinc-100 p-0 text-zinc-950"
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
                    {shareMenu.isOpen ? (
                        <ShareMenu
                            alignToViewportTop={isOverlayHeader}
                            canShareGame={canShareGame}
                            isCreating={shareMenu.isCreating}
                            menuRef={shareMenu.menuRef}
                            message={shareMenu.message}
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
                    <RecorderActionBar
                        anchor={actionBar.anchor}
                        canShareGame={canShareGame}
                        canUndo={gameState.moves.length > 0}
                        dragX={actionBar.dragX}
                        hasStoneCorrectionSelection={hasStoneCorrectionSelection}
                        onClosePlacementZoom={handleClosePlacementZoom}
                        onExitStoneEditMode={handleExitStoneEditMode}
                        onLostPointerCapture={
                            actionBar.dragHandlers.onLostPointerCapture
                        }
                        onPass={handlePass}
                        onPointerCancel={actionBar.dragHandlers.onPointerCancel}
                        onPointerDown={actionBar.dragHandlers.onPointerDown}
                        onPointerMove={actionBar.dragHandlers.onPointerMove}
                        onPointerUp={actionBar.dragHandlers.onPointerUp}
                        onToggleShareMenu={shareMenu.toggle}
                        onUndo={handleUndo}
                        railRef={actionBar.railRef}
                        shareMenuOpen={shareMenu.isOpen}
                        shareTriggerRef={shareMenu.triggerRef}
                        showPlacementZoomControl={Boolean(placementZoomWindow)}
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
                        onPointerDown={(event) => {
                            if (
                                event.target instanceof HTMLElement &&
                                event.target.closest("button")
                            ) {
                                return;
                            }

                            event.preventDefault();
                            event.currentTarget.setPointerCapture(event.pointerId);
                            const vertex = placementZoomWindow
                                ? getPlacementVertexFromPointer(
                                      event.clientX,
                                      event.clientY
                                  )
                                : getFullBoardVertexFromPointer(
                                      event.clientX,
                                      event.clientY
                                  );

                            didSelectStoneByHoldRef.current = false;
                            setDidStartStoneSelectionDrag(false);
                            clearStoneSelectTimeout();
                            isPendingPlacementZoomRef.current = false;
                            isStonePlacementActiveRef.current = Boolean(vertex);
                            stonePlacementCanCommitRef.current = Boolean(vertex);
                            if (!vertex) {
                                touchPreviewVertexRef.current = null;
                                setTouchPreview(null);
                                return;
                            }

                            const editableMoveIndex = getEditableMoveIndexAtVertex({
                                moves: gameState.moves,
                                vertex,
                                visibleStoneOwners: replay.visibleStoneOwners,
                            });

                            isPendingPlacementZoomRef.current = Boolean(
                                !placementZoomWindow &&
                                    selectedMoveIndexes.length === 0 &&
                                    editableMoveIndex === null &&
                                    getEnabledPlacementZoomWindow(vertex)
                            );

                            if (!isPendingPlacementZoomRef.current) {
                                touchPreviewVertexRef.current = vertex;
                                setTouchPreview({
                                    ...vertex,
                                    screenX: event.clientX,
                                    screenY: event.clientY,
                                });
                            }

                            if (placementZoomWindow && editableMoveIndex !== null) {
                                return;
                            }

                            if (selectedMoveIndexes.length > 0) {
                                stoneSelectOriginRef.current = vertex;
                                didDragStoneSelectionRef.current = false;
                                stoneSelectionDragStartMoveIndexRef.current =
                                    editableMoveIndex;
                                stoneSelectionDragVisitedMoveIndexesRef.current.clear();
                                touchPreviewVertexRef.current = vertex;
                                return;
                            }

                            if (
                                shouldStartStoneSelectionHold({
                                    editableMoveIndexAtVertex: editableMoveIndex,
                                    selectedMoveIndexes,
                                }) &&
                                editableMoveIndex !== null
                            ) {
                                stoneSelectOriginRef.current = vertex;
                                stoneSelectTimeoutRef.current = window.setTimeout(() => {
                                    didSelectStoneByHoldRef.current = true;
                                    setSelectedMoveIndexes((current) => {
                                        const nextSelection = current.includes(editableMoveIndex)
                                            ? current
                                            : [...current, editableMoveIndex];
                                        selectedMoveIndexesRef.current = nextSelection;
                                        return nextSelection;
                                    });
                                    setShareStatus(null);
                                    stoneSelectTimeoutRef.current = null;
                                }, STONE_SELECT_HOLD_MS);
                            }
                        }}
                        onPointerMove={(event) => {
                            if (!isStonePlacementActiveRef.current) return;
                            event.preventDefault();
                            if (isPendingPlacementZoomRef.current) return;

                            const vertex = updateTouchPreview(
                                event.clientX,
                                event.clientY
                            );
                            if (selectedMoveIndexesRef.current.length > 0) {
                                setPlacementZoomWindow(null);
                                const origin = stoneSelectOriginRef.current;
                                const didLeaveOrigin =
                                    origin !== null &&
                                    didPointerLeaveHoldVertex({ origin, vertex });
                                if (
                                    didLeaveOrigin &&
                                    !didDragStoneSelectionRef.current
                                ) {
                                    didDragStoneSelectionRef.current = true;
                                    setIsCorrectionDragActive(true);

                                    const startMoveIndex =
                                        stoneSelectionDragStartMoveIndexRef.current;
                                    if (startMoveIndex !== null) {
                                        visitStoneSelectionDragMove(startMoveIndex);
                                    }
                                }

                                const editableMoveIndex = vertex
                                    ? getEditableMoveIndexAtVertex({
                                          moves: gameState.moves,
                                          vertex,
                                          visibleStoneOwners: replay.visibleStoneOwners,
                                      })
                                    : null;

                                if (
                                    didLeaveOrigin &&
                                    editableMoveIndex !== null &&
                                    !stoneSelectionDragVisitedMoveIndexesRef.current.has(
                                        editableMoveIndex
                                    )
                                ) {
                                    visitStoneSelectionDragMove(editableMoveIndex);
                                }

                                return;
                            }

                            const origin = stoneSelectOriginRef.current;

                            if (
                                stoneSelectTimeoutRef.current !== null &&
                                didPointerLeaveHoldVertex({ origin, vertex })
                            ) {
                                clearStoneSelectTimeout();
                            }
                        }}
                        onPointerUp={(event) => {
                            if (
                                event.target instanceof HTMLElement &&
                                event.target.closest("button")
                            ) {
                                return;
                            }

                            const vertex = placementZoomWindow
                                ? getPlacementVertexFromPointer(
                                      event.clientX,
                                      event.clientY
                                  )
                                : getFullBoardVertexFromPointer(
                                      event.clientX,
                                      event.clientY
                                  );
                            const editableMoveIndex = vertex
                                ? getEditableMoveIndexAtVertex({
                                      moves: gameState.moves,
                                      vertex,
                                      visibleStoneOwners: replay.visibleStoneOwners,
                                  })
                                : null;

                            if (stoneSelectTimeoutRef.current !== null) {
                                clearStoneSelectTimeout();
                            }

                            const releaseTouchPreview = () => {
                                isStonePlacementActiveRef.current = false;
                                stonePlacementCanCommitRef.current = false;
                                isPendingPlacementZoomRef.current = false;
                                setTouchPreview(null);
                                event.currentTarget.releasePointerCapture(
                                    event.pointerId
                                );
                                clearStoneSelectionDragState();
                            };

                            if (!stonePlacementCanCommitRef.current || !vertex) {
                                releaseTouchPreview();
                                return;
                            }

                            if (didSelectStoneByHoldRef.current) {
                                releaseTouchPreview();
                                return;
                            }

                            if (didDragStoneSelectionRef.current) {
                                releaseTouchPreview();
                                return;
                            }

                            if (selectedMoveIndexesRef.current.length === 0) {
                                if (editableMoveIndex !== null) {
                                    releaseTouchPreview();
                                    return;
                                }

                                if (!placementZoomWindow) {
                                    const zoomWindow =
                                        getEnabledPlacementZoomWindow(vertex);

                                    if (zoomWindow) {
                                        setPlacementZoomWindow(zoomWindow);
                                        releaseTouchPreview();
                                        return;
                                    }
                                }

                                playMove(vertex.x, vertex.y);
                                releaseTouchPreview();
                                return;
                            }

                            if (editableMoveIndex !== null) {
                                const correctionTapAction = getCorrectionTapAction({
                                    editableMoveIndexAtVertex: editableMoveIndex,
                                    selectedMoveIndexes: selectedMoveIndexesRef.current,
                                });

                                if (
                                    correctionTapAction === "deselect" ||
                                    correctionTapAction === "select"
                                ) {
                                    toggleSelectedMoveIndex(editableMoveIndex);
                                }

                                releaseTouchPreview();
                                return;
                            }

                            releaseTouchPreview();
                        }}
                        onPointerCancel={(event) => {
                            if (
                                event.target instanceof HTMLElement &&
                                event.target.closest("button")
                            ) {
                                return;
                            }

                            clearStoneSelectTimeout();
                            setSelectedGroupDragOrigin(null);
                            clearStoneSelectionDragState();
                            isStonePlacementActiveRef.current = false;
                            stonePlacementCanCommitRef.current = false;
                            clearPlacementZoom();
                            setTouchPreview(null);
                            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                event.currentTarget.releasePointerCapture(event.pointerId);
                            }
                        }}
                    >
                    <BoardView
                        vertexSize={vertexSize}
                        signMap={boardSignMap}
                        markerMap={boardMarkerMap}
                        selectedVertices={renderSelectedVertices}
                        dimmedVertices={renderDimmedVertices}
                        showCoordinates
                    />
                        {placementZoomWindow ? (
                            <div
                                aria-hidden="true"
                                className={placementZoomClassName}
                                style={{
                                    left: gridMetrics.left - placementZoomVertexSize,
                                    top: gridMetrics.top - placementZoomVertexSize,
                                }}
                            >
                                <BoardView
                                    vertexSize={placementZoomVertexSize}
                                    signMap={boardSignMap}
                                    markerMap={boardMarkerMap}
                                    selectedVertices={renderSelectedVertices}
                                    dimmedVertices={renderDimmedVertices}
                                    rangeX={placementZoomRangeX}
                                    rangeY={placementZoomRangeY}
                                    showCoordinates
                                />
                            </div>
                        ) : null}
                        {hasStoneCorrectionSelection ? (
                            <div
                                className={
                                    isDarkMode
                                        ? "absolute z-30 inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-950 shadow-lg"
                                        : "absolute z-30 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white shadow-lg"
                                }
                                style={{
                                    left: stoneCorrectionHandlePosition?.left ?? 0,
                                    top: stoneCorrectionHandlePosition?.top ?? 0,
                                    transform:
                                        stoneCorrectionHandlePosition?.transform,
                                }}
                            >
                                <button
                                    type="button"
                                    className="inline-flex h-11 w-11 cursor-grab items-center justify-center active:cursor-grabbing"
                                    onPointerDown={startStoneSelectionHandleDrag}
                                    onPointerMove={updateStoneSelectionHandleDrag}
                                    onPointerUp={finishStoneSelectionHandleDrag}
                                    onPointerCancel={cancelStoneSelectionHandleDrag}
                                    onLostPointerCapture={cancelStoneSelectionHandleDrag}
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
                        {shouldShowTouchGuide && touchGuideMetrics && (
                            <svg
                                className="pointer-events-none absolute z-20"
                                style={{
                                    left: touchGuideMetrics.left,
                                    top: touchGuideMetrics.top,
                                }}
                                width={touchGuideMetrics.boardSizePx}
                                height={touchGuideMetrics.boardSizePx}
                                viewBox={`0 0 ${touchGuideMetrics.boardSizePx} ${touchGuideMetrics.boardSizePx}`}
                            >
                                <line
                                    x1={0}
                                    y1={
                                        touchGuideMetrics.y *
                                            touchGuideMetrics.cellSize +
                                        touchGuideMetrics.cellSize / 2
                                    }
                                    x2={touchGuideMetrics.boardSizePx}
                                    y2={
                                        touchGuideMetrics.y *
                                            touchGuideMetrics.cellSize +
                                        touchGuideMetrics.cellSize / 2
                                    }
                                    stroke="rgb(56 189 248 / 0.8)"
                                    strokeWidth="1"
                                    vectorEffect="non-scaling-stroke"
                                />
                                <line
                                    x1={
                                        touchGuideMetrics.x *
                                            touchGuideMetrics.cellSize +
                                        touchGuideMetrics.cellSize / 2
                                    }
                                    y1={0}
                                    x2={
                                        touchGuideMetrics.x *
                                            touchGuideMetrics.cellSize +
                                        touchGuideMetrics.cellSize / 2
                                    }
                                    y2={touchGuideMetrics.boardSizePx}
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
