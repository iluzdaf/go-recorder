"use client";

import { useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type { ComponentType } from "react";

import type { GameState, Move, Stone } from "./types";

// @sabaki/go-board does not ship TypeScript types, so keep the boundary small.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Board = require("@sabaki/go-board");

const Goban = ShudanGoban as unknown as ComponentType<any>;

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
    const size = 19;

    const [gameState, setGameState] = useState<GameState>({
        moves: [],
        currentPlayer: "B",
    });

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
        <div className="p-4">
            <button
                className="mb-4 rounded bg-black px-4 py-2 text-white disabled:opacity-40"
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
                className="mb-4 ml-2 rounded bg-neutral-700 px-4 py-2 text-white"
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

            <Goban
                vertexSize={24}
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
    );
}