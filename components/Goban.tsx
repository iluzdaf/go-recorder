"use client";

import { useEffect, useRef, useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type { ComponentType } from "react";

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

    const [gameState, setGameState] = useState<GameState>({
        moves: [],
        currentPlayer: "B",
    });

    useEffect(() => {
        const boardArea = boardAreaRef.current;
        if (!boardArea) return;

        const updateVertexSize = () => {
            const { width, height } = boardArea.getBoundingClientRect();
            const availableSize = Math.min(width, height);
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
                    ? "goban-theme-dark flex h-screen flex-col p-3"
                    : "goban-theme-light flex h-screen flex-col p-3"
            }
        >
            <div className="mb-3 flex shrink-0 flex-wrap gap-2">
                {[9, 13, 19].map((boardSize) => (
                    <button
                        key={boardSize}
                        className={
                            size === boardSize
                                ? "rounded bg-black px-4 py-2 text-white"
                                : "rounded bg-neutral-200 px-4 py-2 text-black"
                        }
                        onClick={() => {
                            setSize(boardSize as BoardSize);
                            setGameState({
                                moves: [],
                                currentPlayer: "B",
                            });
                        }}
                    >
                        {boardSize}x{boardSize}
                    </button>
                ))}
                <button
                    className={
                        isDarkMode
                            ? "rounded bg-neutral-200 px-4 py-2 text-black"
                            : "rounded bg-neutral-800 px-4 py-2 text-white"
                    }
                    onClick={() => setIsDarkMode(!isDarkMode)}
                >
                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                </button>

                <button
                    className="rounded bg-black px-4 py-2 text-white disabled:opacity-40"
                    disabled={gameState.moves.length === 0}
                    onClick={() => {
                        if (gameState.moves.length === 0) return;

                        const previousMoves = gameState.moves.slice(0, -1);
                        const lastMove = gameState.moves.at(-1);

                        setGameState({
                            moves: previousMoves,
                            currentPlayer: lastMove?.color ?? "B",
                        });
                    }}
                >
                    Undo
                </button>

                <button
                    className="rounded bg-neutral-700 px-4 py-2 text-white"
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
                    }}
                >
                    Pass
                </button>

                <button
                    className="rounded bg-blue-700 px-4 py-2 text-white"
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
                    }}
                >
                    Download SGF
                </button>
            </div>

            <div
                ref={boardAreaRef}
                className="flex min-h-0 flex-1 items-center justify-center overflow-hidden"
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