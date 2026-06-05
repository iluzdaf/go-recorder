"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type { ComponentType, PointerEvent as ReactPointerEvent } from "react";
import {
    CircleDot,
    Copy,
    Download,
    Link2,
    X,
    SquareArrowUpRight,
    SquareArrowOutUpRight,
    Hand,
    Undo2,
} from "lucide-react";
import QRCode from "qrcode";

import type {
    BoardSize,
    GameState,
    LocalGameRecord,
    Move,
    Stone,
} from "./types";
import { exportSgf, createSgfFilename } from "./sgf";
import {
    createGameSnapshot,
    shouldAutosave,
    shouldContinueAutosaveQueue,
} from "../lib/gameLogic";
import { getLocalGame, saveLocalGame } from "../lib/localGames";
import { createLoadedLocalGame } from "../lib/localGameView";
import { createShareFromLocalGame } from "../lib/shareClient";
import { formatMoveEditError, t } from "../lib/i18n";
import { useTheme } from "./AppShell";
import BoardStatusMessage from "./BoardStatusMessage";
import { replayGame } from "../lib/gameReplay";
import {
    applyRecorderCorrection,
    createStoneSelectionDragState,
    didPointerLeaveHoldVertex,
    getCorrectionTapAction,
    getEditableMoveIndexAtVertex,
    getSelectedMoveVertices,
    getStoneCorrectionOrigin,
    getStoneSelectionDragVertexFromPointer,
    getVertexFromBoardPointer,
    isRecorderCorrectionLegal,
    isStoneSelectionDragActive,
    shouldShowCorrectionTouchGuide,
    shouldShowOriginalSelectedStones,
    shouldShowPlacementPreview,
    shouldStartStoneSelectionHold,
    toggleCorrectionSelection,
    visitCorrectionSelectionDragMove,
    type BoardGridGeometry,
    type StoneSelectionDragState,
    type Vertex,
} from "../lib/gameCorrectionUi";

type ShudanGobanProps = {
    vertexSize: number;
    signMap: number[][];
    markerMap: (null | { type: "circle" })[][];
    showCoordinates: boolean;
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

type ActionBarAnchor = "left" | "center" | "right";

type ActionBarDragState = {
    pointerId: number;
    grabOffsetX: number;
};

type ShareMenuMode = "chooser" | "created";

function stoneToSign(stone: Stone) {
    return stone === "B" ? 1 : -1;
}

function cloneSignMap(signMap: number[][]) {
    return signMap.map((row) => [...row]);
}

const BOARD_PADDING_PX = 16;
const STONE_SELECT_HOLD_MS = 450;
const STONE_CORRECTION_PILL_HEIGHT_PX = 52;
const STONE_CORRECTION_PILL_GAP_PX = 8;
const ACTION_BAR_STORAGE_KEY_PREFIX = "go-recorder:game-action-bar-anchor:";

function getActionBarStorageKey(id: string) {
    return `${ACTION_BAR_STORAGE_KEY_PREFIX}${id}`;
}

function isActionBarAnchor(value: string | null): value is ActionBarAnchor {
    return value === "left" || value === "center" || value === "right";
}

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

export default function GoBoard({ id }: GoBoardProps) {
    const [size, setSize] = useState<BoardSize>(19);
    const { isDarkMode } = useTheme();
    const boardAreaRef = useRef<HTMLDivElement | null>(null);
    const gobanWrapperRef = useRef<HTMLDivElement | null>(null);
    const hasLoadedGameRef = useRef(false);
    const isSavingRef = useRef(false);
    const needsSaveAfterCurrentSaveRef = useRef(false);
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
    const latestSaveStateRef = useRef<{
        size: BoardSize;
        gameState: GameState;
        updatedAt: string | null;
    }>({
        size: 19,
        gameState: {
            setupStones: [],
            moves: [],
            currentPlayer: "B",
        },
        updatedAt: null,
    });
    const [vertexSize, setVertexSize] = useState(24);
    const [touchPreview, setTouchPreview] = useState<TouchPreview>(null);
    const [selectedGroupDragOrigin, setSelectedGroupDragOriginState] =
        useState<Vertex | null>(null);
    const [selectedMoveIndexes, setSelectedMoveIndexes] = useState<number[]>([]);
    const selectedMoveIndexesRef = useRef<number[]>([]);
    const touchPreviewVertexRef = useRef<Vertex | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [shareStatus, setShareStatus] = useState<string | null>(null);
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    const [shareMenuMode, setShareMenuMode] =
        useState<ShareMenuMode>("chooser");
    const [shareSlug, setShareSlug] = useState<string | null>(null);
    const [shareQrCodeDataUrl, setShareQrCodeDataUrl] = useState<string | null>(
        null
    );
    const [shareMenuMessage, setShareMenuMessage] = useState<string | null>(
        null
    );
    const [shareMenuIsCreating, setShareMenuIsCreating] = useState(false);
    const shareMenuRef = useRef<HTMLDivElement | null>(null);
    const shareTriggerRef = useRef<HTMLButtonElement | null>(null);
    const shareAutoCreateAttemptedRef = useRef(false);
    const dismissShareStatus = useCallback(() => setShareStatus(null), []);
    const isStonePlacementActiveRef = useRef(false);
    const stonePlacementCanCommitRef = useRef(false);
    const actionBarDragRef = useRef<ActionBarDragState | null>(null);
    const actionBarRailRef = useRef<HTMLDivElement | null>(null);
    const [actionBarAnchor, setActionBarAnchor] = useState<ActionBarAnchor>(() => {
        if (typeof window === "undefined") return "center";

        const storedAnchor = window.localStorage.getItem(
            getActionBarStorageKey(id)
        );

        return isActionBarAnchor(storedAnchor) ? storedAnchor : "center";
    });
    const [actionBarDragX, setActionBarDragX] = useState<number | null>(null);
    const [gameMetadata, setGameMetadata] = useState({
        blackPlayerName: null as string | null,
        whitePlayerName: null as string | null,
        handicap: 0,
    });
    const [gridMetrics, setGridMetrics] = useState({
        left: 0,
        top: 0,
        cellSize: 24,
        boardSizePx: 24 * 19,
    });

    const [gameState, setGameState] = useState<GameState>({
        setupStones: [],
        moves: [],
        currentPlayer: "B",
    });

    useEffect(() => {
        latestSaveStateRef.current = {
            size,
            gameState,
            updatedAt,
        };
    }, [size, gameState, updatedAt]);

    useEffect(() => {
        selectedMoveIndexesRef.current = selectedMoveIndexes;
    }, [selectedMoveIndexes]);

    useEffect(() => {
        const loadGame = () => {
            const gameRecord = getLocalGame(id);

            if (!gameRecord) {
                setLoadError(t("gameNotFound"));
                return;
            }

            const loadedGame = createLoadedLocalGame(gameRecord);

            localGameRecordRef.current = gameRecord;
            setShareSlug(gameRecord.lastShareSlug ?? null);
            setShareMenuMode(gameRecord.lastShareSlug ? "created" : "chooser");
            setShareQrCodeDataUrl(null);
            setShareMenuMessage(null);
            setShareMenuIsCreating(false);
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
    }, [id]);

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

        const saveLatestGame = async () => {
            if (isSavingRef.current) {
                needsSaveAfterCurrentSaveRef.current = true;
                return;
            }

            isSavingRef.current = true;

            try {
                while (true) {
                    needsSaveAfterCurrentSaveRef.current = false;

                    const latestSaveState = latestSaveStateRef.current;

                    if (!latestSaveState.updatedAt) return;

                    const latestSnapshot = createGameSnapshot(
                        latestSaveState.size,
                        latestSaveState.gameState
                    );

                    if (latestSnapshot === lastSavedSnapshotRef.current) {
                        setHasUnsavedChanges(false);
                        return;
                    }

                    const localGameRecord = localGameRecordRef.current;

                    if (!localGameRecord) {
                        console.error("Failed to save game: local game record was not loaded");
                        return;
                    }

                    const savedGame = saveLocalGame({
                        ...localGameRecord,
                        boardSize: latestSaveState.size,
                        gameState: latestSaveState.gameState,
                    });

                    localGameRecordRef.current = savedGame;
                    setUpdatedAt(savedGame.updatedAt);
                    latestSaveStateRef.current = {
                        ...latestSaveStateRef.current,
                        updatedAt: savedGame.updatedAt,
                    };
                    lastSavedSnapshotRef.current = latestSnapshot;

                    if (
                        !shouldContinueAutosaveQueue({
                            needsSaveAfterCurrentSave:
                                needsSaveAfterCurrentSaveRef.current,
                            latestSnapshot: createGameSnapshot(
                                latestSaveStateRef.current.size,
                                latestSaveStateRef.current.gameState
                            ),
                            lastSavedSnapshot: lastSavedSnapshotRef.current,
                        })
                    ) {
                        setHasUnsavedChanges(false);
                        return;
                    }
                }
            } catch (error) {
                console.error("Failed to save game", error);
            } finally {
                isSavingRef.current = false;
            }
        };

        const timeoutId = window.setTimeout(() => {
            saveLatestGame();
        }, 500);

        return () => window.clearTimeout(timeoutId);
    }, [id, updatedAt, hasUnsavedChanges, size, gameState]);

    useEffect(() => {
        const boardArea = boardAreaRef.current;
        const gobanWrapper = gobanWrapperRef.current;
        if (!boardArea || !gobanWrapper) return;

        const updateBoardGeometry = () => {
            const { width, height } = boardArea.getBoundingClientRect();
            const availableSize = Math.max(0, Math.min(width, height) - BOARD_PADDING_PX);
            const coordinateGutterVertices = 1;
            const nextVertexSize = Math.max(
                16,
                Math.floor(availableSize / (size + coordinateGutterVertices))
            );

            setVertexSize(nextVertexSize);

            const grid = gobanWrapper.querySelector(".shudan-grid");
            if (!(grid instanceof SVGElement)) return;

            const wrapperRect = gobanWrapper.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();
            const nextGridMetrics = {
                left: gridRect.left - wrapperRect.left,
                top: gridRect.top - wrapperRect.top,
                cellSize: gridRect.width / size,
                boardSizePx: gridRect.width,
            };

            setGridMetrics(nextGridMetrics);
        };

        updateBoardGeometry();

        const resizeObserver = new ResizeObserver(updateBoardGeometry);
        resizeObserver.observe(boardArea);

        return () => resizeObserver.disconnect();
    }, [size]);

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

              for (const moveIndex of selectedMoveIndexes) {
                  const move = gameState.moves[moveIndex];

                  if (move?.type !== "play") continue;

                  const nextX = move.x + dx;
                  const nextY = move.y + dy;

                  if (nextX < 0 || nextX >= size || nextY < 0 || nextY >= size) {
                      return null;
                  }

                  previewSignMap[move.y][move.x] = 0;
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
    const dragPreviewAnchorVertex = dragPreview?.selectedVertices[0]
        ? {
              x: dragPreview.selectedVertices[0][0],
              y: dragPreview.selectedVertices[0][1],
          }
        : null;
    const stoneCorrectionAnchorVertex =
        dragPreviewAnchorVertex ?? selectedMoveVertices[0];
    const hasStoneCorrectionSelection = Boolean(stoneCorrectionAnchorVertex);
    const stoneCorrectionPillLeft = stoneCorrectionAnchorVertex
        ? gridMetrics.left +
          stoneCorrectionAnchorVertex.x * gridMetrics.cellSize +
          gridMetrics.cellSize / 2
        : 0;
    const stoneCorrectionPillTop = stoneCorrectionAnchorVertex
        ? Math.max(
              8,
              gridMetrics.top +
                  stoneCorrectionAnchorVertex.y * gridMetrics.cellSize -
                  STONE_CORRECTION_PILL_GAP_PX -
                  STONE_CORRECTION_PILL_HEIGHT_PX
          )
        : 0;

    const getGridMetrics = () => {
        const gobanWrapper = gobanWrapperRef.current;
        if (!gobanWrapper) return null;

        const grid = gobanWrapper.querySelector(".shudan-grid");
        if (!(grid instanceof SVGElement)) return null;

        const wrapperRect = gobanWrapper.getBoundingClientRect();
        const gridRect = grid.getBoundingClientRect();
        const nextGridMetrics = {
            left: gridRect.left - wrapperRect.left,
            top: gridRect.top - wrapperRect.top,
            cellSize: gridRect.width / size,
            boardSizePx: gridRect.width,
        };

        setGridMetrics(nextGridMetrics);
        const gridGeometry: BoardGridGeometry = {
            left: gridRect.left,
            top: gridRect.top,
            cellSize: nextGridMetrics.cellSize,
            boardSize: size,
        };

        return { gridGeometry, gridRect, nextGridMetrics };
    };

    const getVertexFromPointer = (clientX: number, clientY: number) => {
        const metrics = getGridMetrics();
        if (!metrics) return null;

        return getVertexFromBoardPointer({
            clientX,
            clientY,
            grid: metrics.gridGeometry,
        });
    };

    const clearStoneSelectTimeout = () => {
        if (stoneSelectTimeoutRef.current !== null) {
            window.clearTimeout(stoneSelectTimeoutRef.current);
        }
        stoneSelectTimeoutRef.current = null;
        stoneSelectOriginRef.current = null;
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
        try {
            board.makeMove(stoneToSign(gameState.currentPlayer), [x, y], {
                preventOverwrite: true,
                preventSuicide: true,
                preventKo: true,
            });
        } catch {
            return;
        }

        clearCachedShareLink();

        const newMove: Move = {
            type: "play",
            x,
            y,
            color: gameState.currentPlayer,
        };

        setGameState({
            ...gameState,
            moves: [...gameState.moves, newMove],
            currentPlayer: gameState.currentPlayer === "B" ? "W" : "B",
        });
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
        const vertex = getVertexFromPointer(clientX, clientY);
        if (!vertex) {
            stonePlacementCanCommitRef.current = false;
            touchPreviewVertexRef.current = null;
            setTouchPreview(null);
            return;
        }

        touchPreviewVertexRef.current = vertex;
        setTouchPreview({
            ...vertex,
            screenX: clientX,
            screenY: clientY,
        });
    };

    const canShareGame = gameState.moves.some((move) => move.type === "play");
    const resetShareMenuState = useCallback(() => {
        shareAutoCreateAttemptedRef.current = false;
        setShareMenuMessage(null);
        setShareMenuIsCreating(false);
    }, []);

    const openShareMenu = useCallback(() => {
        setShareMenuMode(shareSlug ? "created" : "chooser");
        setShareMenuOpen(true);
    }, [shareSlug]);

    const closeShareMenu = useCallback(() => {
        resetShareMenuState();
        setShareMenuOpen(false);
    }, [resetShareMenuState]);

    const toggleShareMenu = useCallback(() => {
        if (shareMenuOpen) {
            closeShareMenu();
            return;
        }

        openShareMenu();
    }, [closeShareMenu, openShareMenu, shareMenuOpen]);

    const clearCachedShareLink = () => {
        setShareSlug(null);
        setShareMenuMode("chooser");
        setShareQrCodeDataUrl(null);

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
        const sgf = exportSgf({
            boardSize: size,
            moves: gameState.moves,
            setupStones: gameState.setupStones,
            handicap: gameMetadata.handicap,
            blackPlayerName: gameMetadata.blackPlayerName,
            whitePlayerName: gameMetadata.whitePlayerName,
        });

        const blob = new Blob([sgf], {
            type: "application/x-go-sgf;charset=utf-8",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = createSgfFilename(
            gameMetadata.blackPlayerName,
            gameMetadata.whitePlayerName
        );
        link.click();

        URL.revokeObjectURL(url);
    }, [gameMetadata.blackPlayerName, gameMetadata.whitePlayerName, gameMetadata.handicap, gameState.moves, gameState.setupStones, size]);

    const handleShare = useCallback(async () => {
        const currentLocalGame = createCurrentLocalGameRecord();

        if (!currentLocalGame) {
            setShareMenuMessage(t("gameNotLoaded"));
            setShareMenuIsCreating(false);
            return;
        }

        if (!canShareGame) {
            setShareMenuMessage(t("addMoveBeforeSharing"));
            setShareMenuIsCreating(false);
            return;
        }

        setShareMenuIsCreating(true);
        setShareMenuMessage(t("creatingShare"));

        try {
            const { slug } = await createShareFromLocalGame({
                localGame: currentLocalGame,
            });

            const updatedLocalGame = saveLocalGame({
                ...currentLocalGame,
                lastShareSlug: slug,
            });

            localGameRecordRef.current = updatedLocalGame;
            setShareSlug(slug);
            setShareMenuMode("created");
            setShareMenuOpen(true);
            setShareQrCodeDataUrl(null);
            setShareMenuMessage(null);
            setShareMenuIsCreating(false);
        } catch (error) {
            setShareMenuMessage(
                error instanceof Error ? error.message : t("failedToCreateShare")
            );
            setShareMenuIsCreating(false);
        }
    }, [canShareGame, createCurrentLocalGameRecord]);

    const sharePath = shareSlug ? `/shares/${shareSlug}` : null;

    useEffect(() => {
        if (!shareMenuOpen) {
            shareAutoCreateAttemptedRef.current = false;
            return;
        }

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
        if (!shareMenuOpen || shareMenuMode !== "chooser" || sharePath) {
            return;
        }

        if (!canShareGame || shareAutoCreateAttemptedRef.current) {
            return;
        }

        shareAutoCreateAttemptedRef.current = true;
        void handleShare();
    }, [canShareGame, handleShare, shareMenuMode, shareMenuOpen, sharePath]);

    useEffect(() => {
        if (!shareMenuOpen || shareMenuMode !== "created" || !sharePath) {
            return;
        }

        let cancelled = false;
        const shareUrl = `${window.location.origin}${sharePath}`;

        void QRCode.toDataURL(shareUrl, {
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
    }, [shareMenuMode, shareMenuOpen, sharePath]);

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
            const dragState = actionBarDragRef.current;

            if (container?.hasPointerCapture(pointerId)) {
                container.releasePointerCapture(pointerId);
            }

            if (dragState?.pointerId === pointerId) {
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
            window.localStorage.setItem(getActionBarStorageKey(id), nextAnchor);
            finishActionBarDrag(event.currentTarget, event.pointerId);
        },
        [finishActionBarDrag, id]
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
                                {shareMenuMode === "created" && sharePath ? (
                                    <>
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
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(
                                                        `${window.location.origin}${sharePath}`
                                                    );
                                                    setShareStatus(t("linkCopied"));
                                                } catch {
                                                    setShareStatus(t("failedToCopyLink"));
                                                }
                                            }}
                                            aria-label={t("copyLink")}
                                            title={t("copyLink")}
                                        >
                                            <Copy size={16} />
                                            <span>{t("copyLink")}</span>
                                        </button>
                                        <Link
                                            href={sharePath}
                                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                        >
                                            <SquareArrowOutUpRight size={16} />
                                            <span>{t("goToSharePage")}</span>
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        {shareMenuMessage ? (
                                            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-zinc-300">
                                                {shareMenuMessage}
                                            </div>
                                        ) : null}
                                        {shareMenuIsCreating ? null : (
                                            <button
                                                type="button"
                                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                                disabled={!canShareGame}
                                                onClick={() => {
                                                    void handleShare();
                                                }}
                                                aria-label={t("createLink")}
                                                title={
                                                    canShareGame
                                                        ? t("createLink")
                                                        : t("addMoveBeforeSharing")
                                                }
                                            >
                                                <Link2 size={16} />
                                                <span>{t("createLink")}</span>
                                            </button>
                                        )}
                                    </>
                                )}
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
                                        <CircleDot size={18} />
                                    </div>
                                    <button
                                        type="button"
                                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                        disabled={gameState.moves.length === 0}
                                        onClick={handleUndo}
                                        aria-label={t("undo")}
                                        title={t("undo")}
                                    >
                                        <Undo2 size={18} />
                                    </button>
                                    <button
                                        type="button"
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                    onClick={handlePass}
                                    aria-label={t("pass")}
                                    title={t("pass")}
                                >
                                    <Hand size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        ref={shareTriggerRef}
                                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                                        onClick={() => {
                                            toggleShareMenu();
                                        }}
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
                                        onLostPointerCapture={handleActionBarLostPointerCapture}
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
                            const vertex = getVertexFromPointer(
                                event.clientX,
                                event.clientY
                            );

                            didSelectStoneByHoldRef.current = false;
                            setDidStartStoneSelectionDrag(false);
                            clearStoneSelectTimeout();
                            isStonePlacementActiveRef.current = Boolean(vertex);
                            stonePlacementCanCommitRef.current = Boolean(vertex);
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

                            const editableMoveIndex = getEditableMoveIndexAtVertex({
                                moves: gameState.moves,
                                vertex,
                                visibleStoneOwners: replay.visibleStoneOwners,
                            });

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
                            updateTouchPreview(event.clientX, event.clientY);

                            const vertex = getVertexFromPointer(
                                event.clientX,
                                event.clientY
                            );
                            if (selectedMoveIndexesRef.current.length > 0) {
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

                            const vertex = getVertexFromPointer(
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
                        {hasStoneCorrectionSelection ? (
                            <div
                                className={
                                    isDarkMode
                                        ? "absolute z-30 inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-950 p-1 shadow-lg"
                                        : "absolute z-30 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-lg"
                                }
                                style={{
                                    left: stoneCorrectionPillLeft,
                                    top: stoneCorrectionPillTop,
                                    transform: "translateX(-50%)",
                                }}
                            >
                                <button
                                    type="button"
                                    className={
                                        isDarkMode
                                            ? "inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950 text-white hover:bg-neutral-900"
                                            : "inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100"
                                    }
                                    onPointerDown={(event) => {
                                        event.stopPropagation();
                                    }}
                                    onPointerUp={(event) => {
                                        event.stopPropagation();
                                    }}
                                    onClick={handleExitStoneEditMode}
                                    aria-label={t("exitStoneCorrectionMode")}
                                    title={t("exitStoneCorrectionMode")}
                                >
                                    <X size={16} />
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex h-11 w-10 cursor-grab items-center justify-center active:cursor-grabbing"
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
                                        className="grid h-6 w-4 grid-cols-2 gap-x-1 gap-y-1 text-zinc-700 dark:text-zinc-200"
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
                        {shouldShowTouchGuide && touchPreview && (
                            <svg
                                className="pointer-events-none absolute z-20"
                                style={{
                                    left: gridMetrics.left,
                                    top: gridMetrics.top,
                                }}
                                width={gridMetrics.boardSizePx}
                                height={gridMetrics.boardSizePx}
                                viewBox={`0 0 ${gridMetrics.boardSizePx} ${gridMetrics.boardSizePx}`}
                            >
                                <line
                                    x1={0}
                                    y1={touchPreview.y * gridMetrics.cellSize + gridMetrics.cellSize / 2}
                                    x2={gridMetrics.boardSizePx}
                                    y2={touchPreview.y * gridMetrics.cellSize + gridMetrics.cellSize / 2}
                                    stroke="rgb(56 189 248 / 0.8)"
                                    strokeWidth="1"
                                    vectorEffect="non-scaling-stroke"
                                />
                                <line
                                    x1={touchPreview.x * gridMetrics.cellSize + gridMetrics.cellSize / 2}
                                    y1={0}
                                    x2={touchPreview.x * gridMetrics.cellSize + gridMetrics.cellSize / 2}
                                    y2={gridMetrics.boardSizePx}
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
