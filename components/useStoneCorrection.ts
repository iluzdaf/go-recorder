"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { BoardSize, Stone } from "./types";
import type { BoardGridMetrics } from "../lib/boardGeometry";
import {
    didPointerLeaveHoldVertex,
    getCorrectionTapAction,
    getPlacementZoomOverlayOffset,
    getStoneCorrectionHandleAnchor,
    getStoneCorrectionHandlePosition,
    isStoneSelectionDragActive,
    shouldShowCorrectionTouchGuide,
    shouldShowOriginalSelectedStones,
    shouldShowPlacementPreview,
    shouldStartStoneSelectionHold,
    toggleCorrectionSelection,
    visitCorrectionSelectionDragMove,
    type BoardAreaZoomWindow,
    type BoardGridGeometry,
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

export type StoneCorrectionApplyResult =
    | {
          ok: true;
          selectedIds: number[];
          status: string | null;
      }
    | {
          ok: false;
          error: string;
      };

export type StoneCorrectionDragPreview = {
    signMap: number[][];
    selectedVertices: [number, number][];
};

/** Geometry abstraction so full-board and position-view boards can reuse the machine. */
export type StoneCorrectionGeometry<TGeometry = BoardGridGeometry> = {
    /** Handle / zoom-overlay sizing source. */
    gridMetrics: BoardGridMetrics;
    /** Measure the live grid; also refreshes gridMetrics. */
    measure: () => TGeometry | null;
    vertexFromPointer: (args: {
        clientX: number;
        clientY: number;
        geometry: TGeometry;
    }) => Vertex | null;
    createDragState: (args: {
        geometry: TGeometry;
        origin: Vertex;
        pointerId: number;
        pointerX: number;
        pointerY: number;
    }) => StoneSelectionDragState;
    dragVertexFromPointer: (args: {
        clientX: number;
        clientY: number;
        dragState: StoneSelectionDragState;
        geometry: TGeometry;
    }) => Vertex | null;
    zoom: {
        enabled: boolean;
        window: (vertex: Vertex) => BoardAreaZoomWindow | null;
        vertexFromPointer: (args: {
            clientX: number;
            clientY: number;
            geometry: TGeometry;
            zoomWindow: BoardAreaZoomWindow;
        }) => Vertex | null;
    };
};

/** Optional freehand stroke painting (board drafts) layered under hold-to-select. */
export type StoneCorrectionStroke = {
    getMode: (vertex: Vertex) => "draw" | "erase";
    paint: (vertex: Vertex, mode: "draw" | "erase") => void;
};

type StoneCorrectionStrokeState = {
    mode: "draw" | "erase";
    pointerId: number;
    origin: Vertex;
    visited: Set<string>;
    moved: boolean;
    originPainted: boolean;
};

/** Surface-specific item operations (moves for the recorder, setup stones for board drafts). */
export type StoneCorrectionAdapter = {
    /** Selectable item id at a vertex, or null if none is editable there. */
    getEditableItemIdAtVertex: (vertex: Vertex) => number | null;
    /** Current board vertices of the selected items. */
    getSelectedItemVertices: (ids: number[]) => Vertex[];
    /** Anchor for a group drag. */
    getOrigin: (ids: number[], from?: Vertex | null) => Vertex | null;
    /** Preview of a group move, or null if illegal / out of bounds. */
    buildDragPreview: (args: {
        ids: number[];
        origin: Vertex;
        target: Vertex;
    }) => StoneCorrectionDragPreview | null;
    /** Marker vertex to hide while it is being dragged (e.g. the last-move circle). */
    getDragHiddenMarkerVertex: (ids: number[]) => Vertex | null;
    /** Commit a validated group move. */
    applyMove: (args: {
        ids: number[];
        target: Vertex;
        from?: Vertex;
    }) => StoneCorrectionApplyResult;
    /** Place a stone on a tap of an empty, non-editable vertex. */
    placeAt: (vertex: Vertex) => void;
};

export type UseStoneCorrectionParams<
    TMarker = StoneCorrectionMarker,
    TGeometry = BoardGridGeometry,
> = {
    boardSize: BoardSize;
    signMap: number[][];
    baseMarkerMap: TMarker[][];
    vertexSize: number;
    showCoordinates: boolean;
    placementPreviewColor: Stone;
    geometry: StoneCorrectionGeometry<TGeometry>;
    adapter: StoneCorrectionAdapter;
    onStatus: (status: string | null) => void;
    /** Whether long-press selection / move is available (false ⇒ stroke + tap only). */
    enableSelection?: boolean;
    /** Optional freehand stroke painting (board drafts). */
    stroke?: StoneCorrectionStroke | null;
};

function stoneToSign(stone: Stone) {
    return stone === "B" ? 1 : -1;
}

function cloneSignMap(signMap: number[][]) {
    return signMap.map((row) => [...row]);
}

const STONE_SELECT_HOLD_MS = 450;
const STONE_CORRECTION_PILL_GAP_PX = 8;

export function useStoneCorrection<
    TMarker = StoneCorrectionMarker,
    TGeometry = BoardGridGeometry,
>({
    boardSize,
    signMap,
    baseMarkerMap,
    vertexSize,
    showCoordinates,
    placementPreviewColor,
    geometry,
    adapter,
    onStatus,
    enableSelection = true,
    stroke = null,
}: UseStoneCorrectionParams<TMarker, TGeometry>) {
    const strokeStateRef = useRef<StoneCorrectionStrokeState | null>(null);
    const stoneSelectTimeoutRef = useRef<number | null>(null);
    const stoneSelectOriginRef = useRef<Vertex | null>(null);
    const selectedGroupDragOriginRef = useRef<Vertex | null>(null);
    const stoneSelectionDragStateRef = useRef<StoneSelectionDragState | null>(
        null
    );
    const stoneSelectionDragStartIdRef = useRef<number | null>(null);
    const stoneSelectionDragVisitedIdsRef = useRef<Set<number>>(new Set());
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
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const selectedIdsRef = useRef<number[]>([]);
    const touchPreviewVertexRef = useRef<Vertex | null>(null);
    const isStonePlacementActiveRef = useRef(false);
    const stonePlacementCanCommitRef = useRef(false);
    const isPendingPlacementZoomRef = useRef(false);

    useEffect(() => {
        selectedIdsRef.current = selectedIds;
    }, [selectedIds]);

    const size = boardSize;
    const gridMetrics = geometry.gridMetrics;

    const selectedItemVertices = adapter.getSelectedItemVertices(selectedIds);
    const selectedVertices = selectedItemVertices.map(
        ({ x, y }) => [x, y] as [number, number]
    );
    const dragOrigin = adapter.getOrigin(selectedIds, selectedGroupDragOrigin);
    const dragPreview =
        touchPreview && dragOrigin && didStartStoneSelectionDrag
            ? adapter.buildDragPreview({
                  ids: selectedIds,
                  origin: dragOrigin,
                  target: touchPreview,
              })
            : null;
    const isMovingSelectedStones = isStoneSelectionDragActive({
        hasTouchPreview: Boolean(touchPreview),
        selectedMoveIndexes: selectedIds,
        didStartStoneSelectionDrag,
    });
    const hasValidDragPreview = Boolean(dragPreview);
    const isDeselectingLastStone =
        isCorrectionDragActive && selectedIds.length === 0;
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
            hasSelectedStone: selectedIds.length > 0,
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
    const dragHiddenMarkerVertex =
        isMovingSelectedStones && hasValidDragPreview
            ? adapter.getDragHiddenMarkerVertex(selectedIds)
            : null;
    const boardMarkerMap = dragHiddenMarkerVertex
        ? (() => {
              const nextMarkerMap = baseMarkerMap.map((row) => [...row]);
              nextMarkerMap[dragHiddenMarkerVertex.y][
                  dragHiddenMarkerVertex.x
              ] = null as TMarker;
              return nextMarkerMap;
          })()
        : baseMarkerMap;
    const stoneCorrectionHandleVertices = dragPreview
        ? dragPreview.selectedVertices.map(([x, y]) => ({ x, y }))
        : selectedItemVertices;
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

    const getFullBoardVertexFromPointer = (clientX: number, clientY: number) => {
        const geometryResult = geometry.measure();
        if (!geometryResult) return null;

        return geometry.vertexFromPointer({
            clientX,
            clientY,
            geometry: geometryResult,
        });
    };

    const getZoomedPlacementVertexFromPointer = (
        clientX: number,
        clientY: number
    ) => {
        if (!placementZoomWindow) return null;

        const geometryResult = geometry.measure();
        if (!geometryResult) return null;

        return geometry.zoom.vertexFromPointer({
            clientX,
            clientY,
            geometry: geometryResult,
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
        if (!geometry.zoom.enabled) return null;

        return geometry.zoom.window(vertex);
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
        strokeStateRef.current = null;
        didDragStoneSelectionRef.current = false;
        stoneSelectOriginRef.current = null;
        selectedGroupDragOriginRef.current = null;
        setSelectedGroupDragOriginState(null);
        stoneSelectionDragStateRef.current = null;
        stoneSelectionDragStartIdRef.current = null;
        stoneSelectionDragVisitedIdsRef.current.clear();
        touchPreviewVertexRef.current = null;
    };

    const toggleSelectedId = (id: number) => {
        setSelectedIds((current) => {
            const nextSelection = toggleCorrectionSelection({
                moveIndex: id,
                selectedMoveIndexes: current,
            });
            selectedIdsRef.current = nextSelection;
            if (nextSelection.length === 0) {
                setSelectedGroupDragOrigin(null);
            }
            return nextSelection;
        });
        onStatus(null);
    };

    const visitStoneSelectionDragMove = (id: number | null) => {
        const result = visitCorrectionSelectionDragMove({
            moveIndex: id,
            selectedMoveIndexes: selectedIdsRef.current,
            visitedMoveIndexes: stoneSelectionDragVisitedIdsRef.current,
        });

        if (!result.didToggle) return;

        stoneSelectionDragVisitedIdsRef.current = result.visitedMoveIndexes;
        selectedIdsRef.current = result.selectedMoveIndexes;
        setSelectedIds(result.selectedMoveIndexes);
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
        const geometryResult = geometry.measure();
        if (!geometryResult) return null;

        return geometry.dragVertexFromPointer({
            clientX,
            clientY,
            dragState,
            geometry: geometryResult,
        });
    };

    const correctStones = (ids: number[], vertex: Vertex, from?: Vertex) => {
        const result = adapter.applyMove({ ids, target: vertex, from });

        if (!result.ok) {
            onStatus(result.error);
            return;
        }

        selectedIdsRef.current = result.selectedIds;
        setSelectedIds(result.selectedIds);
        onStatus(result.status);
    };

    const startStoneSelectionHandleDrag = (
        event: ReactPointerEvent<HTMLButtonElement>
    ) => {
        if (selectedIdsRef.current.length === 0) return;

        const origin = adapter.getOrigin(selectedIdsRef.current);

        if (!origin) return;

        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);

        const geometryResult = geometry.measure();
        if (!geometryResult) return;

        stoneSelectionDragStateRef.current = geometry.createDragState({
            geometry: geometryResult,
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
            correctStones(selectedIdsRef.current, pointerVertex, origin);
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
        selectedIdsRef.current = [];
        setSelectedGroupDragOrigin(null);
        setSelectedIds([]);
        setTouchPreview(null);
    };

    const clearSelection = useCallback(() => {
        selectedIdsRef.current = [];
        setSelectedIds([]);
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
        strokeStateRef.current = null;
        isPendingPlacementZoomRef.current = false;
        isStonePlacementActiveRef.current = Boolean(vertex);
        stonePlacementCanCommitRef.current = Boolean(vertex);
        if (!vertex) {
            touchPreviewVertexRef.current = null;
            setTouchPreview(null);
            return;
        }

        const editableId = adapter.getEditableItemIdAtVertex(vertex);

        isPendingPlacementZoomRef.current = Boolean(
            !placementZoomWindow &&
                selectedIds.length === 0 &&
                editableId === null &&
                getEnabledPlacementZoomWindow(vertex)
        );

        // Stroke painting suppresses the single-stone placement ghost.
        if (!isPendingPlacementZoomRef.current && !stroke) {
            touchPreviewVertexRef.current = vertex;
            setTouchPreview({
                ...vertex,
                screenX: event.clientX,
                screenY: event.clientY,
            });
        }

        if (placementZoomWindow && editableId !== null) {
            return;
        }

        if (selectedIds.length > 0) {
            stoneSelectOriginRef.current = vertex;
            didDragStoneSelectionRef.current = false;
            stoneSelectionDragStartIdRef.current = editableId;
            stoneSelectionDragVisitedIdsRef.current.clear();
            touchPreviewVertexRef.current = vertex;
            return;
        }

        const startSelectionHold = (id: number) => {
            stoneSelectOriginRef.current = vertex;
            stoneSelectTimeoutRef.current = window.setTimeout(() => {
                didSelectStoneByHoldRef.current = true;
                strokeStateRef.current = null;
                setSelectedIds((current) => {
                    const nextSelection = current.includes(id)
                        ? current
                        : [...current, id];
                    selectedIdsRef.current = nextSelection;
                    return nextSelection;
                });
                onStatus(null);
                stoneSelectTimeoutRef.current = null;
            }, STONE_SELECT_HOLD_MS);
        };

        const canHoldSelect =
            enableSelection &&
            editableId !== null &&
            shouldStartStoneSelectionHold({
                editableMoveIndexAtVertex: editableId,
                selectedMoveIndexes: selectedIds,
            });

        if (stroke) {
            const mode = stroke.getMode(vertex);
            const strokeState: StoneCorrectionStrokeState = {
                mode,
                pointerId: event.pointerId,
                origin: vertex,
                visited: new Set(),
                moved: false,
                originPainted: false,
            };
            strokeStateRef.current = strokeState;

            if (mode === "draw") {
                // Empty vertex: paint immediately; nothing to hold-select here.
                strokeState.visited.add(`${vertex.x},${vertex.y}`);
                strokeState.originPainted = true;
                stroke.paint(vertex, "draw");
            } else if (canHoldSelect && editableId !== null) {
                // Existing stone: defer the erase so a long-press can select.
                startSelectionHold(editableId);
            }

            return;
        }

        if (canHoldSelect && editableId !== null) {
            startSelectionHold(editableId);
        }
    };

    const onBoardPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isStonePlacementActiveRef.current) return;
        event.preventDefault();
        if (isPendingPlacementZoomRef.current) return;

        if (
            stroke &&
            strokeStateRef.current &&
            selectedIdsRef.current.length === 0
        ) {
            const strokeState = strokeStateRef.current;
            const vertex = getFullBoardVertexFromPointer(
                event.clientX,
                event.clientY
            );
            if (!vertex) return;

            const leftOrigin =
                vertex.x !== strokeState.origin.x ||
                vertex.y !== strokeState.origin.y;

            if (leftOrigin) {
                strokeState.moved = true;
                // A drag is a stroke, not a hold-to-select.
                clearStoneSelectTimeout();

                if (!strokeState.originPainted) {
                    strokeState.visited.add(
                        `${strokeState.origin.x},${strokeState.origin.y}`
                    );
                    strokeState.originPainted = true;
                    stroke.paint(strokeState.origin, strokeState.mode);
                }
            }

            // Only paint the trail once a stroke has actually started, so a
            // stationary long-press on a stone can still hold-to-select.
            if (strokeState.moved) {
                const vertexKey = `${vertex.x},${vertex.y}`;
                if (!strokeState.visited.has(vertexKey)) {
                    strokeState.visited.add(vertexKey);
                    stroke.paint(vertex, strokeState.mode);
                }
            }

            return;
        }

        const vertex = updateTouchPreview(event.clientX, event.clientY);
        if (selectedIdsRef.current.length > 0) {
            setPlacementZoomWindow(null);
            const origin = stoneSelectOriginRef.current;
            const didLeaveOrigin =
                origin !== null && didPointerLeaveHoldVertex({ origin, vertex });
            if (didLeaveOrigin && !didDragStoneSelectionRef.current) {
                didDragStoneSelectionRef.current = true;
                setIsCorrectionDragActive(true);

                const startId = stoneSelectionDragStartIdRef.current;
                if (startId !== null) {
                    visitStoneSelectionDragMove(startId);
                }
            }

            const editableId = vertex
                ? adapter.getEditableItemIdAtVertex(vertex)
                : null;

            if (
                didLeaveOrigin &&
                editableId !== null &&
                !stoneSelectionDragVisitedIdsRef.current.has(editableId)
            ) {
                visitStoneSelectionDragMove(editableId);
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

        if (
            stroke &&
            strokeStateRef.current &&
            selectedIdsRef.current.length === 0
        ) {
            const strokeState = strokeStateRef.current;
            // A tap on an existing stone (deferred erase) with no drag / hold.
            if (
                !didSelectStoneByHoldRef.current &&
                !strokeState.moved &&
                !strokeState.originPainted
            ) {
                stroke.paint(strokeState.origin, strokeState.mode);
            }
            strokeStateRef.current = null;
            releaseTouchPreview();
            return;
        }

        const vertex = placementZoomWindow
            ? getPlacementVertexFromPointer(event.clientX, event.clientY)
            : getFullBoardVertexFromPointer(event.clientX, event.clientY);
        const editableId = vertex
            ? adapter.getEditableItemIdAtVertex(vertex)
            : null;

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

        if (selectedIdsRef.current.length === 0) {
            if (editableId !== null) {
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

            adapter.placeAt(vertex);
            releaseTouchPreview();
            return;
        }

        if (editableId !== null) {
            const correctionTapAction = getCorrectionTapAction({
                editableMoveIndexAtVertex: editableId,
                selectedMoveIndexes: selectedIdsRef.current,
            });

            if (
                correctionTapAction === "deselect" ||
                correctionTapAction === "select"
            ) {
                toggleSelectedId(editableId);
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
        selectedIds,
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
