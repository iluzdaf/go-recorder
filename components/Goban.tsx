"use client";

import { useEffect, useRef, useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type { ComponentType } from "react";
import { Download, Moon, Sun, Undo2 } from "lucide-react";

import type { BoardSize, GameState, Move, Stone } from "./types";
import { exportSgf } from "./sgf";
import {
    createGameSnapshot,
    shouldAutosave,
    shouldContinueAutosaveQueue,
} from "../lib/gameLogic";

// @sabaki/go-board does not ship TypeScript types, so keep the boundary small.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Board = require("@sabaki/go-board");

type ShudanGobanProps = {
    vertexSize: number;
    signMap: number[][];
    markerMap: (null | { type: "circle" })[][];
};

const Goban = ShudanGoban as unknown as ComponentType<ShudanGobanProps>;

type TouchPreview = {
    x: number;
    y: number;
    screenX: number;
    screenY: number;
} | null;

type GoBoardProps = {
    slug: string;
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

function buildBoardFromMoves(size: number, moves: Move[]) {
    let board = Board.fromDimensions(size);

    for (const move of moves) {
        if (move.type === "pass") continue;

        board = board.makeMove(stoneToSign(move.color), [move.x, move.y], {
            preventOverwrite: true,
            preventSuicide: true,
            preventKo: true,
        });
    }

    return board;
}

export default function GoBoard({ slug }: GoBoardProps) {
    const [size, setSize] = useState<BoardSize>(19);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const boardAreaRef = useRef<HTMLDivElement | null>(null);
    const gobanWrapperRef = useRef<HTMLDivElement | null>(null);
    const hasLoadedGameRef = useRef(false);
    const isSavingRef = useRef(false);
    const needsSaveAfterCurrentSaveRef = useRef(false);
    const lastSavedSnapshotRef = useRef("");
    const latestSaveStateRef = useRef<{
        size: BoardSize;
        gameState: GameState;
        updatedAt: string | null;
    }>({
        size: 19,
        gameState: {
            moves: [],
            currentPlayer: "B",
        },
        updatedAt: null,
    });
    const [vertexSize, setVertexSize] = useState(24);
    const [showMenu, setShowMenu] = useState(false);
    const [touchPreview, setTouchPreview] = useState<TouchPreview>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [gridMetrics, setGridMetrics] = useState({
        left: 0,
        top: 0,
        cellSize: 24,
        boardSizePx: 24 * 19,
    });

    const [gameState, setGameState] = useState<GameState>({
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
        document.documentElement.classList.toggle("dark", isDarkMode);
    }, [isDarkMode]);

    useEffect(() => {
        const loadGame = async () => {
            const response = await fetch(`/api/games/${slug}`);

            if (!response.ok) {
                console.error("Failed to load game", await response.text());
                return;
            }

            const gameRecord = await response.json();

            setSize(gameRecord.board_size as BoardSize);
            setGameState(gameRecord.game_state as GameState);
            setUpdatedAt(gameRecord.updated_at);
            lastSavedSnapshotRef.current = createGameSnapshot(
                gameRecord.board_size as BoardSize,
                gameRecord.game_state as GameState
            );
            setHasUnsavedChanges(false);
            hasLoadedGameRef.current = true;
        };

        loadGame();
    }, [slug]);

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

                    const response = await fetch(`/api/games/${slug}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            boardSize: latestSaveState.size,
                            gameState: latestSaveState.gameState,
                            updatedAt: latestSaveState.updatedAt,
                        }),
                    });

                    if (response.status === 409) {
                        const conflict = await response.json();

                        if (conflict.newSlug) {
                            window.location.href = `/games/${conflict.newSlug}`;
                            return;
                        }
                    }

                    if (!response.ok) {
                        console.error("Failed to save game", await response.text());
                        return;
                    }

                    const savedGame = await response.json();

                    setUpdatedAt(savedGame.updated_at);
                    latestSaveStateRef.current = {
                        ...latestSaveStateRef.current,
                        updatedAt: savedGame.updated_at,
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
    }, [slug, updatedAt, hasUnsavedChanges, size, gameState]);

    useEffect(() => {
        const boardArea = boardAreaRef.current;
        if (!boardArea) return;

        const updateVertexSize = () => {
            const { width, height } = boardArea.getBoundingClientRect();
            const availableSize = Math.min(width, height) - 4;
            const nextVertexSize = Math.max(16, Math.floor(availableSize / size));

            setVertexSize(nextVertexSize);
        };

        updateVertexSize();

        const resizeObserver = new ResizeObserver(updateVertexSize);
        resizeObserver.observe(boardArea);

        return () => resizeObserver.disconnect();
    }, [size]);

    const board = buildBoardFromMoves(size, gameState.moves);
    const signMap = board.signMap;

    type Marker = null | { type: "circle" };

    const markerMap: Marker[][] = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => null)
    );

    const lastMove = gameState.moves.at(-1);

    if (lastMove?.type === "play") {
        markerMap[lastMove.y][lastMove.x] = { type: "circle" };
    }

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
            moves: [...gameState.moves, newMove],
            currentPlayer: gameState.currentPlayer === "B" ? "W" : "B",
        });
        setHasUnsavedChanges(true);
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
                    ? "goban-theme-dark relative m-0 flex h-dvh touch-none flex-col overflow-hidden overscroll-none bg-neutral-900 p-0 text-white"
                    : "goban-theme-light relative m-0 flex h-dvh touch-none flex-col overflow-hidden overscroll-none bg-zinc-100 p-0 text-zinc-950"
            }
        >


            <div
                ref={boardAreaRef}
                className="flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden overscroll-none p-0"
                onPointerDownCapture={(event) => {
                    const target = event.target as HTMLElement;

                    if (target.closest("[data-action-menu]")) {
                        return;
                    }

                    if (target.closest(".shudan-goban")) {
                        setShowMenu(false);
                        return;
                    }

                    setShowMenu((previous) => !previous);
                }}
            >
                <div
                    ref={gobanWrapperRef}
                    className="relative"
                    onPointerDown={(event) => {
                        if ((event.target as HTMLElement).closest("[data-action-menu]")) {
                            return;
                        }

                        event.currentTarget.setPointerCapture(event.pointerId);
                        setShowMenu(false);
                        updateTouchPreview(event.clientX, event.clientY);
                    }}
                    onPointerMove={(event) => {
                        if (!touchPreview) return;
                        updateTouchPreview(event.clientX, event.clientY);
                    }}
                    onPointerUp={(event) => {
                        if (!touchPreview) return;

                        playMove(touchPreview.x, touchPreview.y);
                        setTouchPreview(null);
                        event.currentTarget.releasePointerCapture(event.pointerId);
                    }}
                    onPointerCancel={() => {
                        setTouchPreview(null);
                    }}
                >
                    <div
                        className="absolute right-1 top-1 z-10 flex flex-col items-end"
                        data-action-menu
                    >
                        {showMenu && (
                            <div className="flex w-48 flex-col gap-2 rounded border border-zinc-300 bg-zinc-100 p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                                {[9, 13, 19].map((boardSize) => (
                                    <button
                                        key={boardSize}
                                        className={
                                            size === boardSize
                                                ? "rounded bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-600"
                                                : "rounded bg-zinc-300 px-4 py-2 text-zinc-800 dark:bg-neutral-700 dark:text-neutral-200"
                                        }
                                        onClick={() => {
                                            setSize(boardSize as BoardSize);
                                            setGameState({
                                                moves: [],
                                                currentPlayer: "B",
                                            });
                                            setHasUnsavedChanges(true);
                                            setShowMenu(false);
                                        }}
                                    >
                                        {boardSize}x{boardSize}
                                    </button>
                                ))}

                                <button
                                    className="flex items-center justify-center rounded bg-zinc-800 px-4 py-2 text-xl text-white dark:bg-neutral-200 dark:text-black"
                                    onClick={() => {
                                        setIsDarkMode(!isDarkMode);
                                        setShowMenu(false);
                                    }}
                                    aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                                >
                                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                                </button>

                                <button
                                    className="rounded bg-amber-700 px-4 py-2 text-white hover:bg-amber-600 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:opacity-100 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
                                    disabled={gameState.moves.length === 0}
                                    onClick={() => {
                                        if (gameState.moves.length === 0) return;

                                        const previousMoves = gameState.moves.slice(0, -1);
                                        const lastMove = gameState.moves.at(-1);

                                        setGameState({
                                            moves: previousMoves,
                                            currentPlayer: lastMove?.color ?? "B",
                                        });
                                        setHasUnsavedChanges(true);
                                        setShowMenu(false);
                                    }}
                                >
                                    <div className="flex items-center justify-center">
                                        <Undo2 size={18} />
                                    </div>
                                </button>

                                <button
                                    className="rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500"
                                    onClick={() => {
                                        const newMove: Move = {
                                            type: "pass",
                                            color: gameState.currentPlayer,
                                        };

                                        setGameState({
                                            moves: [...gameState.moves, newMove],
                                            currentPlayer:
                                                gameState.currentPlayer === "B" ? "W" : "B",
                                        });
                                        setHasUnsavedChanges(true);
                                        setShowMenu(false);
                                    }}
                                >
                                    Pass
                                </button>

                                <button
                                    className="rounded bg-sky-700 px-4 py-2 text-white hover:bg-sky-600"
                                    onClick={() => {
                                        const sgf = exportSgf(size, gameState.moves);

                                        const blob = new Blob([sgf], {
                                            type: "application/x-go-sgf;charset=utf-8",
                                        });

                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement("a");

                                        link.href = url;
                                        link.download = "game.sgf";
                                        link.click();

                                        URL.revokeObjectURL(url);
                                        setShowMenu(false);
                                    }}
                                >
                                    <div className="flex items-center justify-center">
                                        <Download size={18} />
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                    <Goban
                        vertexSize={vertexSize}
                        signMap={signMap}
                        markerMap={markerMap}
                    />
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
                    {touchPreview && signMap[touchPreview.y][touchPreview.x] === 0 && (
                        <div
                            className={
                                gameState.currentPlayer === "B"
                                    ? "pointer-events-none absolute z-30 rounded-full border border-sky-300 bg-black/70"
                                    : "pointer-events-none absolute z-30 rounded-full border border-sky-300 bg-white/80"
                            }
                            style={{
                                left:
                                    gridMetrics.left +
                                    touchPreview.x * gridMetrics.cellSize +
                                    gridMetrics.cellSize / 2,
                                top:
                                    gridMetrics.top +
                                    touchPreview.y * gridMetrics.cellSize +
                                    gridMetrics.cellSize / 2,
                                width: gridMetrics.cellSize * 0.78,
                                height: gridMetrics.cellSize * 0.78,
                                transform: "translate(-50%, -50%)",
                            }}
                        />
                    )}
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
                                {gameState.currentPlayer === "B" ? "Black" : "White"} • {`${touchPreview.x + 1}, ${touchPreview.y + 1}`}
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
                                            {cell.isCenter && cell.sign === 0 && (
                                                <div
                                                    className={
                                                        gameState.currentPlayer === "B"
                                                            ? "relative h-6 w-6 rounded-full border border-sky-300 bg-black/80"
                                                            : "relative h-6 w-6 rounded-full border border-sky-300 bg-white/90"
                                                    }
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}