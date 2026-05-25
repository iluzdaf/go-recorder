"use client";

import { useEffect, useRef, useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type { ComponentType } from "react";
import { Download, Menu, Moon, Sun, Undo2, X } from "lucide-react";

import type { GameState, Move, Stone } from "./types";
import { exportSgf } from "./sgf";

// @sabaki/go-board does not ship TypeScript types, so keep the boundary small.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Board = require("@sabaki/go-board");

const Goban = ShudanGoban as unknown as ComponentType<any>;

type BoardSize = 9 | 13 | 19;

function stoneToSign(stone: Stone) {
    return stone === "B" ? 1 : -1;
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

export default function GoBoard() {
    const [size, setSize] = useState<BoardSize>(19);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const boardAreaRef = useRef<HTMLDivElement | null>(null);
    const [vertexSize, setVertexSize] = useState(24);
    const [showMenu, setShowMenu] = useState(false);

    const [gameState, setGameState] = useState<GameState>({
        moves: [],
        currentPlayer: "B",
    });

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

    return (
        <div
            className={
                isDarkMode
                    ? "goban-theme-dark relative flex h-dvh flex-col overflow-hidden p-0"
                    : "goban-theme-light relative flex h-dvh flex-col overflow-hidden p-0"
            }
        >
            <div className="absolute right-2 top-2 z-10 flex flex-col items-end">
                <button
                    className="rounded bg-neutral-700 px-3 py-2 text-white shadow-lg"
                    onClick={() => setShowMenu(!showMenu)}
                    aria-label={showMenu ? "Close menu" : "Open menu"}
                >
                    {showMenu ? <X size={20} /> : <Menu size={20} />}
                </button>

                {showMenu && (
                    <div className="mt-2 flex w-48 flex-col gap-2 rounded border border-neutral-700 bg-neutral-900 p-2 shadow-xl">
                        {[9, 13, 19].map((boardSize) => (
                            <button
                                key={boardSize}
                                className={
                                    size === boardSize
                                        ? "rounded bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-600"
                                        : "rounded bg-neutral-700 px-4 py-2 text-neutral-200"
                                }
                                onClick={() => {
                                    setSize(boardSize as BoardSize);
                                    setGameState({
                                        moves: [],
                                        currentPlayer: "B",
                                    });
                                    setShowMenu(false);
                                }}
                            >
                                {boardSize}x{boardSize}
                            </button>
                        ))}

                        <button
                            className={
                                isDarkMode
                                    ? "flex items-center justify-center rounded bg-neutral-200 px-4 py-2 text-xl text-black"
                                    : "flex items-center justify-center rounded bg-neutral-800 px-4 py-2 text-xl text-white"
                            }
                            onClick={() => {
                                setIsDarkMode(!isDarkMode);
                                setShowMenu(false);
                            }}
                            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <button
                            className="rounded bg-amber-700 px-4 py-2 text-white hover:bg-amber-600 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-100"
                            disabled={gameState.moves.length === 0}
                            onClick={() => {
                                if (gameState.moves.length === 0) return;

                                const previousMoves = gameState.moves.slice(0, -1);
                                const lastMove = gameState.moves.at(-1);

                                setGameState({
                                    moves: previousMoves,
                                    currentPlayer: lastMove?.color ?? "B",
                                });
                                setShowMenu(false);
                            }}
                        >
                            <div className="flex items-center justify-center">
                                <Undo2 size={18} />
                            </div>
                        </button>

                        <button
                            className="rounded bg-slate-600 px-4 py-2 text-white hover:bg-slate-500"
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

            <div
                ref={boardAreaRef}
                className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-0"
            >
                <Goban
                    vertexSize={vertexSize}
                    signMap={signMap}
                    markerMap={markerMap}
                    onVertexClick={(event: unknown, [x, y]: [number, number]) => {
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
                    }}
                />
            </div>
        </div>
    );
}