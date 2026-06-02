"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type { ComponentType } from "react";
import { Download, Share2, SkipForward, Undo2 } from "lucide-react";

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
import { formatMoveEditError, formatShareCreated, t } from "../lib/i18n";
import { useHeaderActions, useTheme } from "./AppShell";
import BoardStatusMessage from "./BoardStatusMessage";
import { replayGame } from "../lib/gameReplay";
import {
    applyRecorderCorrection,
    didPointerLeaveHoldVertex,
    getCorrectionPreviewStones,
    getCorrectionTapAction,
    getEditableMoveIndexAtVertex,
    getSelectedMoveVertices,
    shouldApplyHoldDragCorrection,
    shouldStartStoneSelectionHold,
    type Vertex,
} from "../lib/gameCorrectionUi";

type ShudanGobanProps = {
    vertexSize: number;
    signMap: number[][];
    markerMap: (null | { type: "circle" })[][];
    showCoordinates: boolean;
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

function getStarPoints(boardSize: BoardSize) {
    if (boardSize === 9) return [2, 4, 6];
    if (boardSize === 13) return [3, 6, 9];
    return [3, 9, 15];
}


function isStarPoint(x: number, y: number, boardSize: BoardSize) {
    const starPoints = getStarPoints(boardSize);
    return starPoints.includes(x) && starPoints.includes(y);
}

function toDisplayCoord(x: number, y: number, boardSize: BoardSize) {
    const columns = [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
    ];

    const column = columns[x] ?? "?";
    const row = boardSize - y;

    return `${column}${row}`;
}

const BOARD_PADDING_PX = 16;
const STONE_SELECT_HOLD_MS = 450;

export default function GoBoard({ id }: GoBoardProps) {
    const [size, setSize] = useState<BoardSize>(19);
    const { isDarkMode } = useTheme();
    const { setHeaderActions } = useHeaderActions();
    const boardAreaRef = useRef<HTMLDivElement | null>(null);
    const gobanWrapperRef = useRef<HTMLDivElement | null>(null);
    const hasLoadedGameRef = useRef(false);
    const isSavingRef = useRef(false);
    const needsSaveAfterCurrentSaveRef = useRef(false);
    const stoneSelectTimeoutRef = useRef<number | null>(null);
    const stoneSelectOriginRef = useRef<Vertex | null>(null);
    const stoneSelectMoveIndexRef = useRef<number | null>(null);
    const selectedGroupDragOriginRef = useRef<Vertex | null>(null);
    const didSelectStoneByHoldRef = useRef(false);
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
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [shareStatus, setShareStatus] = useState<string | null>(null);
    const dismissShareStatus = useCallback(() => setShareStatus(null), []);
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
        if (!boardArea) return;

        const updateVertexSize = () => {
            const { width, height } = boardArea.getBoundingClientRect();
            const availableSize = Math.max(0, Math.min(width, height) - BOARD_PADDING_PX);
            const coordinateGutterVertices = 1;
            const nextVertexSize = Math.max(
                16,
                Math.floor(availableSize / (size + coordinateGutterVertices))
            );

            setVertexSize(nextVertexSize);
        };

        updateVertexSize();

        const resizeObserver = new ResizeObserver(updateVertexSize);
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

    const selectedVertices = getSelectedMoveVertices({
        gameState,
        selectedMoveIndexes,
    });
    const touchPreviewStones = touchPreview
        ? getCorrectionPreviewStones({
              currentPlayer: gameState.currentPlayer,
              from:
                  selectedGroupDragOrigin &&
                  shouldApplyHoldDragCorrection({
                      origin: selectedGroupDragOrigin,
                      vertex: touchPreview,
                  })
                      ? selectedGroupDragOrigin
                      : null,
              gameState,
              selectedMoveIndexes,
              vertex: touchPreview,
          }).filter(
              (stone) => stone.x >= 0 && stone.x < size && stone.y >= 0 && stone.y < size
          )
        : [];

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
        return { gridRect, nextGridMetrics };
    };

    const getVertexFromPointer = (clientX: number, clientY: number) => {
        const metrics = getGridMetrics();
        if (!metrics) return null;

        const { gridRect, nextGridMetrics } = metrics;
        const localX = clientX - gridRect.left;
        const localY = clientY - gridRect.top;

        const x = Math.round(localX / nextGridMetrics.cellSize - 0.5);
        const y = Math.round(localY / nextGridMetrics.cellSize - 0.5);

        if (x < 0 || x >= size || y < 0 || y >= size) return null;

        return { x, y };
    };

    const clearStoneSelectTimeout = () => {
        if (stoneSelectTimeoutRef.current !== null) {
            window.clearTimeout(stoneSelectTimeoutRef.current);
        }
        stoneSelectTimeoutRef.current = null;
        stoneSelectOriginRef.current = null;
        stoneSelectMoveIndexRef.current = null;
    };

    const setSelectedGroupDragOrigin = (vertex: Vertex | null) => {
        selectedGroupDragOriginRef.current = vertex;
        setSelectedGroupDragOriginState(vertex);
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

    const getSelectionWithHeldMove = (moveIndex: number | null) => {
        if (moveIndex === null) return selectedMoveIndexesRef.current;
        if (selectedMoveIndexesRef.current.includes(moveIndex)) {
            return selectedMoveIndexesRef.current;
        }

        return [...selectedMoveIndexesRef.current, moveIndex];
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

        setGameState(result.gameState);
        setSelectedMoveIndexes(result.selectedMoveIndexes);
        setShareStatus(result.status);
        setHasUnsavedChanges(result.hasUnsavedChanges);
        return true;
    };

    const correctSelectedMoves = (vertex: Vertex) => {
        return correctMoves(selectedMoveIndexes, vertex);
    };

    const updateTouchPreview = (clientX: number, clientY: number) => {
        const vertex = getVertexFromPointer(clientX, clientY);
        if (!vertex) return;

        setTouchPreview({
            ...vertex,
            screenX: clientX,
            screenY: clientY,
        });
    };

    const getMagnifierCells = () => {
        if (!touchPreview) return [];

        const cells = [];

        for (let dy = -2; dy <= 2; dy += 1) {
            for (let dx = -2; dx <= 2; dx += 1) {
                const x = touchPreview.x + dx;
                const y = touchPreview.y + dy;
                const isOnBoard = x >= 0 && x < size && y >= 0 && y < size;
                const sign = isOnBoard ? signMap[y][x] : 0;

                cells.push({
                    key: `${dx},${dy}`,
                    x,
                    y,
                    dx,
                    dy,
                    sign,
                    isOnBoard,
                    isCenter: dx === 0 && dy === 0,
                    isStarPoint: isOnBoard && isStarPoint(x, y, size),
                });
            }
        }

        return cells;
    };

    const getMagnifierPositionPercent = (offset: number) => {
        return 12.5 + (offset + 2) * 18.75;
    };

    const canShareGame = gameState.moves.some((move) => move.type === "play");

    const createCurrentLocalGameRecord = useCallback(() => {
        const localGameRecord = localGameRecordRef.current;
        if (!localGameRecord) return null;

        return {
            ...localGameRecord,
            boardSize: size,
            gameState,
        };
    }, [gameState, size]);

    const handleUndo = useCallback(() => {
        if (gameState.moves.length === 0) return;

        const previousMoves = gameState.moves.slice(0, -1);
        const lastMove = gameState.moves.at(-1);

        setGameState({
            ...gameState,
            moves: previousMoves,
            currentPlayer: lastMove?.color ?? "B",
        });
        setSelectedMoveIndexes([]);
        setHasUnsavedChanges(true);
    }, [gameState]);

    const handlePass = useCallback(() => {
        const newMove: Move = {
            type: "pass",
            color: gameState.currentPlayer,
        };

        setGameState({
            ...gameState,
            moves: [...gameState.moves, newMove],
            currentPlayer: gameState.currentPlayer === "B" ? "W" : "B",
        });
        setSelectedMoveIndexes([]);
        setHasUnsavedChanges(true);
    }, [gameState]);

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
            setShareStatus(t("gameNotLoaded"));
            return;
        }

        if (!canShareGame) {
            setShareStatus(t("addMoveBeforeSharing"));
            return;
        }

        setShareStatus(t("creatingShare"));

        try {
            const { slug } = await createShareFromLocalGame({
                localGame: currentLocalGame,
            });

            const updatedLocalGame = saveLocalGame({
                ...currentLocalGame,
                lastShareSlug: slug,
            });

            localGameRecordRef.current = updatedLocalGame;
            setShareStatus(formatShareCreated(`/shares/${slug}`));
            window.location.href = `/shares/${slug}`;
        } catch (error) {
            setShareStatus(
                error instanceof Error ? error.message : t("failedToCreateShare")
            );
        }
    }, [canShareGame, createCurrentLocalGameRecord]);

    const headerActions = useMemo(
        () => (
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                    disabled={gameState.moves.length === 0}
                    onClick={handleUndo}
                    aria-label={t("undo")}
                    title={t("undo")}
                >
                    <Undo2 size={18} />
                </button>
                <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                    onClick={handlePass}
                    aria-label={t("pass")}
                    title={t("pass")}
                >
                    <SkipForward size={18} />
                </button>
                <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                    onClick={handleDownloadSgf}
                    aria-label={t("downloadSgf")}
                    title={t("downloadSgf")}
                >
                    <Download size={18} />
                </button>
                <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                    disabled={!canShareGame}
                    onClick={() => {
                        void handleShare();
                    }}
                    aria-label={t("share")}
                    title={t("share")}
                >
                    <Share2 size={18} />
                </button>
            </div>
        ),
        [
            canShareGame,
            gameState.moves.length,
            handleDownloadSgf,
            handlePass,
            handleShare,
            handleUndo,
        ]
    );

    useEffect(() => {
        setHeaderActions(headerActions);
    }, [headerActions, setHeaderActions]);

    useEffect(() => {
        return () => {
            setHeaderActions(null);
        };
    }, [setHeaderActions]);

    useEffect(() => {
        return () => {
            clearStoneSelectTimeout();
        };
    }, []);

    const getMagnifierGridLines = () => {
        if (!touchPreview) {
            return { horizontalLines: [], verticalLines: [] };
        }

        const horizontalLines = [];
        const verticalLines = [];

        for (let dy = -2; dy <= 2; dy += 1) {
            const y = touchPreview.y + dy;
            if (y < 0 || y >= size) continue;

            const onBoardDxValues = [-2, -1, 0, 1, 2].filter((dx) => {
                const x = touchPreview.x + dx;
                return x >= 0 && x < size;
            });

            if (onBoardDxValues.length === 0) continue;

            const firstDx = onBoardDxValues[0];
            const lastDx = onBoardDxValues[onBoardDxValues.length - 1];
            const boardContinuesLeft = touchPreview.x + firstDx > 0;
            const boardContinuesRight = touchPreview.x + lastDx < size - 1;

            horizontalLines.push({
                key: `h-${dy}`,
                top: getMagnifierPositionPercent(dy),
                left: boardContinuesLeft ? 0 : getMagnifierPositionPercent(firstDx),
                right: boardContinuesRight ? 100 : getMagnifierPositionPercent(lastDx),
            });
        }

        for (let dx = -2; dx <= 2; dx += 1) {
            const x = touchPreview.x + dx;
            if (x < 0 || x >= size) continue;

            const onBoardDyValues = [-2, -1, 0, 1, 2].filter((dy) => {
                const y = touchPreview.y + dy;
                return y >= 0 && y < size;
            });

            if (onBoardDyValues.length === 0) continue;

            const firstDy = onBoardDyValues[0];
            const lastDy = onBoardDyValues[onBoardDyValues.length - 1];
            const boardContinuesTop = touchPreview.y + firstDy > 0;
            const boardContinuesBottom = touchPreview.y + lastDy < size - 1;

            verticalLines.push({
                key: `v-${dx}`,
                left: getMagnifierPositionPercent(dx),
                top: boardContinuesTop ? 0 : getMagnifierPositionPercent(firstDy),
                bottom: boardContinuesBottom ? 100 : getMagnifierPositionPercent(lastDy),
            });
        }

        return { horizontalLines, verticalLines };
    };

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
                <>
                    <BoardStatusMessage
                        message={shareStatus}
                        onDismiss={dismissShareStatus}
                    />
                    <div
                        ref={boardAreaRef}
                        className="flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden overscroll-none p-0"
                    >
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
                            event.preventDefault();
                            event.currentTarget.setPointerCapture(event.pointerId);
                            const vertex = getVertexFromPointer(
                                event.clientX,
                                event.clientY
                            );

                            didSelectStoneByHoldRef.current = false;
                            setSelectedGroupDragOrigin(null);
                            clearStoneSelectTimeout();

                            if (!vertex) {
                                setTouchPreview(null);
                                return;
                            }

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

                            if (selectedMoveIndexes.length > 1) {
                                setSelectedGroupDragOrigin(vertex);
                            }

                            if (
                                shouldStartStoneSelectionHold({
                                    editableMoveIndexAtVertex: editableMoveIndex,
                                    selectedMoveIndexes,
                                }) &&
                                editableMoveIndex !== null
                            ) {
                                const heldMoveIndex = editableMoveIndex;

                                stoneSelectOriginRef.current = vertex;
                                stoneSelectMoveIndexRef.current = heldMoveIndex;
                                stoneSelectTimeoutRef.current = window.setTimeout(() => {
                                    didSelectStoneByHoldRef.current = true;
                                    setSelectedMoveIndexes((current) => {
                                        const nextSelection = current.includes(heldMoveIndex)
                                            ? current
                                            : [...current, heldMoveIndex];
                                        selectedMoveIndexesRef.current = nextSelection;
                                        return nextSelection;
                                    });
                                    setShareStatus(null);
                                    stoneSelectTimeoutRef.current = null;
                                }, STONE_SELECT_HOLD_MS);
                            }
                        }}
                        onPointerMove={(event) => {
                            if (!touchPreview) return;
                            event.preventDefault();
                            updateTouchPreview(event.clientX, event.clientY);

                            const vertex = getVertexFromPointer(
                                event.clientX,
                                event.clientY
                            );
                            const origin = stoneSelectOriginRef.current;

                            if (
                                stoneSelectTimeoutRef.current !== null &&
                                didPointerLeaveHoldVertex({ origin, vertex })
                            ) {
                                clearStoneSelectTimeout();
                            }
                        }}
                        onPointerUp={(event) => {
                            const vertex = touchPreview;
                            const origin = stoneSelectOriginRef.current;
                            const holdMoveIndex = stoneSelectMoveIndexRef.current;
                            const selectedGroupDragOrigin = selectedGroupDragOriginRef.current;

                            if (stoneSelectTimeoutRef.current !== null) {
                                clearStoneSelectTimeout();
                            }

                            if (
                                vertex &&
                                shouldApplyHoldDragCorrection({
                                    origin: selectedGroupDragOrigin,
                                    vertex,
                                })
                            ) {
                                correctMoves(
                                    selectedMoveIndexesRef.current,
                                    vertex,
                                    selectedGroupDragOrigin ?? undefined
                                );
                                setSelectedGroupDragOrigin(null);
                                setTouchPreview(null);
                                event.currentTarget.releasePointerCapture(event.pointerId);
                                return;
                            }

                            setSelectedGroupDragOrigin(null);

                            if (didSelectStoneByHoldRef.current) {
                                didSelectStoneByHoldRef.current = false;
                                if (
                                    vertex &&
                                    shouldApplyHoldDragCorrection({
                                        origin,
                                        vertex,
                                    })
                                ) {
                                    correctMoves(
                                        getSelectionWithHeldMove(holdMoveIndex),
                                        vertex,
                                        origin ?? undefined
                                    );
                                }
                                stoneSelectOriginRef.current = null;
                                stoneSelectMoveIndexRef.current = null;
                                setTouchPreview(null);
                                event.currentTarget.releasePointerCapture(event.pointerId);
                                return;
                            }

                            if (!vertex) {
                                event.currentTarget.releasePointerCapture(event.pointerId);
                                return;
                            }

                            const editableMoveIndex = getEditableMoveIndexAtVertex({
                                moves: gameState.moves,
                                vertex,
                                visibleStoneOwners: replay.visibleStoneOwners,
                            });
                            const correctionTapAction = getCorrectionTapAction({
                                editableMoveIndexAtVertex: editableMoveIndex,
                                selectedMoveIndexes,
                            });

                            if (correctionTapAction === "deselect") {
                                setSelectedMoveIndexes((current) =>
                                    current.filter((moveIndex) => moveIndex !== editableMoveIndex)
                                );
                                setTouchPreview(null);
                                event.currentTarget.releasePointerCapture(event.pointerId);
                                return;
                            }

                            if (correctionTapAction === "correct") {
                                correctSelectedMoves(vertex);
                                setTouchPreview(null);
                                event.currentTarget.releasePointerCapture(event.pointerId);
                                return;
                            }

                            playMove(touchPreview.x, touchPreview.y);
                            setTouchPreview(null);
                            event.currentTarget.releasePointerCapture(event.pointerId);
                        }}
                        onPointerCancel={() => {
                            clearStoneSelectTimeout();
                            setSelectedGroupDragOrigin(null);
                            didSelectStoneByHoldRef.current = false;
                            setTouchPreview(null);
                        }}
                    >
                        <BoardView
                            vertexSize={vertexSize}
                            signMap={signMap}
                            markerMap={markerMap}
                            showCoordinates
                        />
                        {selectedVertices.map((selectedVertex) => (
                            <div
                                key={`${selectedVertex.x},${selectedVertex.y}`}
                                className="pointer-events-none absolute z-30 rounded-full border-2 border-sky-400 shadow-[0_0_0_3px_rgb(14_165_233_/_0.25)]"
                                style={{
                                    left:
                                        gridMetrics.left +
                                        selectedVertex.x * gridMetrics.cellSize +
                                        gridMetrics.cellSize / 2,
                                    top:
                                        gridMetrics.top +
                                        selectedVertex.y * gridMetrics.cellSize +
                                        gridMetrics.cellSize / 2,
                                    width: gridMetrics.cellSize * 0.92,
                                    height: gridMetrics.cellSize * 0.92,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}
                        {touchPreview && (
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
                        {touchPreviewStones
                            .filter(
                                (stone) =>
                                    selectedMoveIndexes.length > 0 || signMap[stone.y][stone.x] === 0
                            )
                            .map((stone, index) => (
                                <div
                                    key={`preview-${stone.x},${stone.y},${index}`}
                                    className={
                                        stone.color === "B"
                                            ? "pointer-events-none absolute z-30 rounded-full border border-sky-300 bg-black/70"
                                            : "pointer-events-none absolute z-30 rounded-full border border-sky-300 bg-white/80"
                                    }
                                    style={{
                                        left:
                                            gridMetrics.left +
                                            stone.x * gridMetrics.cellSize +
                                            gridMetrics.cellSize / 2,
                                        top:
                                            gridMetrics.top +
                                            stone.y * gridMetrics.cellSize +
                                            gridMetrics.cellSize / 2,
                                        width: gridMetrics.cellSize * 0.78,
                                        height: gridMetrics.cellSize * 0.78,
                                        transform: "translate(-50%, -50%)",
                                    }}
                                />
                            ))}
                    {touchPreview && (
                        <div
                            className={
                                isDarkMode
                                    ? "pointer-events-none fixed z-50 h-36 w-36 -translate-x-1/2 overflow-hidden rounded-full border border-sky-400/70 bg-neutral-950/95 text-white shadow-2xl"
                                    : "pointer-events-none fixed z-50 h-36 w-36 -translate-x-1/2 overflow-hidden rounded-full border border-sky-600/70 bg-zinc-100/95 text-zinc-950 shadow-2xl"
                            }
                            style={{
                                left: touchPreview.screenX,
                                top: Math.max(12, touchPreview.screenY - 170),
                            }}
                        >
                            <div
                                className={
                                    isDarkMode
                                        ? "absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-neutral-950/80 px-2 py-0.5 text-xs font-medium text-neutral-300"
                                        : "absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-100/80 px-2 py-0.5 text-xs font-medium text-zinc-700"
                                }
                            >
                                {toDisplayCoord(touchPreview.x, touchPreview.y, size)}
                            </div>

                            <div className={isDarkMode ? "relative h-full w-full bg-neutral-800" : "relative h-full w-full bg-zinc-200"}>
                                {getMagnifierGridLines().horizontalLines.map((line) => (
                                    <div
                                        key={line.key}
                                        className={isDarkMode ? "absolute h-px bg-neutral-600" : "absolute h-px bg-zinc-500"}
                                        style={{
                                            top: `${line.top}%`,
                                            left: `${line.left}%`,
                                            width: `${line.right - line.left}%`,
                                        }}
                                    />
                                ))}
                                {getMagnifierGridLines().verticalLines.map((line) => (
                                    <div
                                        key={line.key}
                                        className={isDarkMode ? "absolute w-px bg-neutral-600" : "absolute w-px bg-zinc-500"}
                                        style={{
                                            left: `${line.left}%`,
                                            top: `${line.top}%`,
                                            height: `${line.bottom - line.top}%`,
                                        }}
                                    />
                                ))}
                                {getMagnifierCells().map((cell) => {
                                    const left = `${getMagnifierPositionPercent(cell.dx)}%`;
                                    const top = `${getMagnifierPositionPercent(cell.dy)}%`;

                                    return (
                                        <div
                                            key={cell.key}
                                            className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                                            style={{ left, top }}
                                        >
                                            {cell.sign === 0 && cell.isStarPoint && (
                                                <div className={isDarkMode ? "absolute h-2 w-2 rounded-full bg-neutral-400" : "absolute h-2 w-2 rounded-full bg-zinc-600"} />
                                            )}
                                            {cell.isCenter && (
                                                <div className="absolute h-7 w-7 rounded-full border border-sky-400" />
                                            )}
                                            {cell.sign === 1 && (
                                                <div className="relative h-6 w-6 rounded-full bg-black" />
                                            )}
                                            {cell.sign === -1 && (
                                                <div className="relative h-6 w-6 rounded-full border border-neutral-900 bg-white" />
                                            )}
                                            {(() => {
                                                const previewStoneAtCell = touchPreviewStones.find(
                                                    (stone) => stone.x === cell.x && stone.y === cell.y
                                                );
                                                const shouldShowPreviewStone =
                                                    previewStoneAtCell &&
                                                    (selectedMoveIndexes.length > 0 || cell.sign === 0);

                                                if (!shouldShowPreviewStone) return null;

                                                return (
                                                    <div
                                                        className={
                                                            previewStoneAtCell.color === "B"
                                                                ? "relative h-6 w-6 rounded-full border border-sky-300 bg-black/80"
                                                                : "relative h-6 w-6 rounded-full border border-sky-300 bg-white/90"
                                                        }
                                                    />
                                                );
                                            })()}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    </div>
                </div>
                </>
            )}
        </div>
    );
}
