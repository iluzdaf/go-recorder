"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import type { BoardSize, GameState, Stone } from "./types";
import {
    getLiveBoardGridMetrics,
    type BoardGridMetrics,
} from "../lib/boardGeometry";
import { replayGame } from "../lib/gameReplay";
import {
    createStoneSelectionDragState,
    didPointerLeaveHoldVertex,
    getCorrectionTapAction,
    getEditableMoveIndexAtVertex,
    getPlacementZoomOverlayOffset,
    getPlacementZoomWindow,
    getSelectedMoveVertices,
    getStoneCorrectionHandleAnchor,
    getStoneCorrectionHandlePosition,
    getStoneCorrectionOrigin,
    getStoneSelectionDragVertexFromPointer,
    getVertexFromBoardPointer,
    getVertexFromPlacementZoomPointer,
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

export type StoneCorrectionMarker = null | { type: "circle" };

export type StoneCorrectionTouchPreview = {
    x: number;
    y: number;
    screenX: number;
    screenY: number;
} | null;

type ApplyCorrectionResult =
    | {
          ok: true;
          gameState: GameState;
          selectedMoveIndexes: number[];
          status: string | null;
          hasUnsavedChanges: true;
      }
    | {
          ok: false;
          error: string;
      };

export type UseStoneCorrectionParams = {
    boardSize: BoardSize;
    gameState: GameState;
    signMap: number[][];
    baseMarkerMap: StoneCorrectionMarker[][];
    visibleStoneOwners: ReturnType<typeof replayGame>["visibleStoneOwners"];
    gridMetrics: BoardGridMetrics;
    setGridMetrics: (metrics: BoardGridMetrics) => void;
    gobanWrapperRef: RefObject<HTMLDivElement | null>;
    vertexSize: number;
    showCoordinates: boolean;
    twoStepPlacement: boolean;
    /** Place a stone on a tap of an empty, non-editable vertex. */
    onPlaceStone: (vertex: Vertex) => void;
    /** Apply a validated group move. */
    applyCorrection: (params: {
        selectedMoveIndexes: number[];
        vertex: Vertex;
        from?: Vertex;
    }) => ApplyCorrectionResult;
    /** Report status / errors to the host (e.g. share status banner). */
    onStatus: (status: string | null) => void;
    /** Color used for the single-stone placement preview. */
    placementPreviewColor: Stone;
};

function stoneToSign(stone: Stone) {
    return stone === "B" ? 1 : -1;
}

function cloneSignMap(signMap: number[][]) {
    return signMap.map((row) => [...row]);
}

const STONE_SELECT_HOLD_MS = 450;
const STONE_CORRECTION_PILL_GAP_PX = 8;

export function useStoneCorrection({
    boardSize,
    gameState,
    signMap,
    baseMarkerMap,
    visibleStoneOwners,
    gridMetrics,
    setGridMetrics,
    gobanWrapperRef,
    vertexSize,
    showCoordinates,
    twoStepPlacement,
    onPlaceStone,
    applyCorrection,
    onStatus,
    placementPreviewColor,
}: UseStoneCorrectionParams) {
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
    const [isCorrectionDragActive, setIsCorrectionDragActive] = useState(false);
    const [touchPreview, setTouchPreview] =
        useState<StoneCorrectionTouchPreview>(null);
    const [placementZoomWindow, setPlacementZoomWindow] =
        useState<BoardAreaZoomWindow | null>(null);
    const [selectedGroupDragOrigin, setSelectedGroupDragOriginState] =
        useState<Vertex | null>(null);
    const [selectedMoveIndexes, setSelectedMoveIndexes] = useState<number[]>([]);
    const selectedMoveIndexesRef = useRef<number[]>([]);
    const touchPreviewVertexRef = useRef<Vertex | null>(null);
    const isStonePlacementActiveRef = useRef(false);
    const stonePlacementCanCommitRef = useRef(false);
    const isPendingPlacementZoomRef = useRef(false);

    useEffect(() => {
        selectedMoveIndexesRef.current = selectedMoveIndexes;
    }, [selectedMoveIndexes]);

    const size = boardSize;

    const selectedMoveVertices = getSelectedMoveVertices({
        gameState,
        selectedMoveIndexes,
    });
    const selectedVertices = selectedMoveVertices.map(
        ({ x, y }) => [x, y] as [number, number]
    );
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
                  if (signMap[touchPreview.y]?.[touchPreview.x] !== 0)
                      return null;

                  const preview = cloneSignMap(signMap);
                  preview[touchPreview.y][touchPreview.x] =
                      stoneToSign(placementPreviewColor);
                  return preview;
              })()
            : null;
    const boardSignMap =
        dragPreview?.signMap ?? placementPreviewSignMap ?? signMap;
    const boardMarkerMap =
        isMovingSelectedStones &&
        hasValidDragPreview &&
        gameState.moves.length > 0 &&
        selectedMoveIndexes.includes(gameState.moves.length - 1)
            ? (() => {
                  const nextMarkerMap = baseMarkerMap.map((row) => [...row]);
                  const lastMove = gameState.moves.at(-1);

                  if (lastMove?.type === "play") {
                      nextMarkerMap[lastMove.y][lastMove.x] = null;
                  }

                  return nextMarkerMap;
              })()
            : baseMarkerMap;
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
    const placementZoomOffset = getPlacementZoomOverlayOffset({
        showCoordinates,
        zoomCellSize: placementZoomVertexSize,
    });
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
        if (!twoStepPlacement) return null;

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

    const setSelectedGroupDragOrigin = (vertex: Vertex | null) => {
        selectedGroupDragOriginRef.current = vertex;
        setSelectedGroupDragOriginState(vertex);
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
        onStatus(null);
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
        onStatus(null);
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

    const correctMoves = (
        moveIndexes: number[],
        vertex: Vertex,
        from?: Vertex
    ) => {
        const result = applyCorrection({
            selectedMoveIndexes: moveIndexes,
            vertex,
            from,
        });

        if (!result.ok) {
            onStatus(result.error);
            return true;
        }

        selectedMoveIndexesRef.current = result.selectedMoveIndexes;
        setSelectedMoveIndexes(result.selectedMoveIndexes);
        onStatus(result.status);
        return true;
    };

    const startStoneSelectionHandleDrag = (
        event: ReactPointerEvent<HTMLButtonElement>
    ) => {
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
        const shouldCommit =
            didStartStoneSelectionDrag && pointerVertex !== null;

        if (shouldCommit && origin !== null) {
            correctMoves(selectedMoveIndexesRef.current, pointerVertex, origin);
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

    const exitStoneEditMode = () => {
        clearStoneSelectTimeout();
        clearStoneSelectionDragState();
        selectedGroupDragOriginRef.current = null;
        selectedMoveIndexesRef.current = [];
        setSelectedGroupDragOrigin(null);
        setSelectedMoveIndexes([]);
        setTouchPreview(null);
    };

    const clearSelection = useCallback(() => {
        selectedMoveIndexesRef.current = [];
        setSelectedMoveIndexes([]);
    }, []);

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

    const handleClosePlacementZoom = useCallback(() => {
        clearPlacementZoom();
        setTouchPreview(null);
    }, []);

    useEffect(() => {
        return () => {
            clearStoneSelectTimeout();
        };
    }, []);

    const onBoardPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (
            event.target instanceof HTMLElement &&
            event.target.closest("button")
        ) {
            return;
        }

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const vertex = placementZoomWindow
            ? getPlacementVertexFromPointer(event.clientX, event.clientY)
            : getFullBoardVertexFromPointer(event.clientX, event.clientY);

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
            visibleStoneOwners,
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
            stoneSelectionDragStartMoveIndexRef.current = editableMoveIndex;
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
                onStatus(null);
                stoneSelectTimeoutRef.current = null;
            }, STONE_SELECT_HOLD_MS);
        }
    };

    const onBoardPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isStonePlacementActiveRef.current) return;
        event.preventDefault();
        if (isPendingPlacementZoomRef.current) return;

        const vertex = updateTouchPreview(event.clientX, event.clientY);
        if (selectedMoveIndexesRef.current.length > 0) {
            setPlacementZoomWindow(null);
            const origin = stoneSelectOriginRef.current;
            const didLeaveOrigin =
                origin !== null && didPointerLeaveHoldVertex({ origin, vertex });
            if (didLeaveOrigin && !didDragStoneSelectionRef.current) {
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
                      visibleStoneOwners,
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
    };

    const onBoardPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (
            event.target instanceof HTMLElement &&
            event.target.closest("button")
        ) {
            return;
        }

        const vertex = placementZoomWindow
            ? getPlacementVertexFromPointer(event.clientX, event.clientY)
            : getFullBoardVertexFromPointer(event.clientX, event.clientY);
        const editableMoveIndex = vertex
            ? getEditableMoveIndexAtVertex({
                  moves: gameState.moves,
                  vertex,
                  visibleStoneOwners,
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
            event.currentTarget.releasePointerCapture(event.pointerId);
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
                const zoomWindow = getEnabledPlacementZoomWindow(vertex);

                if (zoomWindow) {
                    setPlacementZoomWindow(zoomWindow);
                    releaseTouchPreview();
                    return;
                }
            }

            onPlaceStone(vertex);
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
    };

    const onBoardPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
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
    };

    return {
        // selection state
        selectedMoveIndexes,
        hasStoneCorrectionSelection,
        clearSelection,
        exitStoneEditMode,
        // board render
        boardSignMap,
        boardMarkerMap,
        renderSelectedVertices,
        renderDimmedVertices,
        // placement zoom
        placementZoomWindow,
        placementZoomVertexSize,
        placementZoomOffset,
        placementZoomRangeX,
        placementZoomRangeY,
        placementZoomClassName,
        handleClosePlacementZoom,
        // touch guide
        shouldShowTouchGuide,
        touchGuideMetrics,
        // correction handle
        stoneCorrectionHandlePosition,
        startStoneSelectionHandleDrag,
        updateStoneSelectionHandleDrag,
        finishStoneSelectionHandleDrag,
        cancelStoneSelectionHandleDrag,
        // board pointer handlers
        onBoardPointerDown,
        onBoardPointerMove,
        onBoardPointerUp,
        onBoardPointerCancel,
    };
}
