"use client";

import { useEffect, useRef, useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type { ComponentType } from "react";
import { Download } from "lucide-react";

import type { Move, SetupStone, ShareRecord, Stone } from "./types";
import { exportSgf, createSgfFilename } from "./sgf";

// @sabaki/go-board does not ship TypeScript types, so keep the boundary small.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Board = require("@sabaki/go-board");

type ShudanGobanProps = {
    vertexSize: number;
    signMap: number[][];
    markerMap: (null | { type: "circle" })[][];
    showCoordinates: boolean;
};

const BoardView = ShudanGoban as unknown as ComponentType<ShudanGobanProps>;

function stoneToSign(stone: Stone) {
    return stone === "B" ? 1 : -1;
}

function buildBoardFromGameState(
    size: number,
    setupStones: SetupStone[],
    moves: Move[]
) {
    let board = Board.fromDimensions(size);

    for (const setupStone of setupStones) {
        board = board.makeMove(stoneToSign("B"), [setupStone.x, setupStone.y], {
            preventOverwrite: true,
            preventSuicide: true,
            preventKo: false,
        });
    }

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

const BOARD_PADDING_PX = 16;

export default function ShareGoBoard({ share }: { share: ShareRecord }) {
    const [vertexSize, setVertexSize] = useState(24);
    const [isDarkMode] = useState(true);
    const boardAreaRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const boardArea = boardAreaRef.current;
        if (!boardArea) return;

        const updateVertexSize = () => {
            const { width, height } = boardArea.getBoundingClientRect();
            const availableSize = Math.max(0, Math.min(width, height) - BOARD_PADDING_PX);
            const coordinateGutterVertices = 1;
            const nextVertexSize = Math.max(
                16,
                Math.floor(
                    availableSize / (share.boardSize + coordinateGutterVertices)
                )
            );

            setVertexSize(nextVertexSize);
        };

        updateVertexSize();

        const resizeObserver = new ResizeObserver(updateVertexSize);
        resizeObserver.observe(boardArea);

        return () => resizeObserver.disconnect();
    }, [share.boardSize]);

    const board = buildBoardFromGameState(
        share.boardSize,
        share.gameState.setupStones,
        share.gameState.moves
    );
    const signMap = board.signMap;

    type Marker = null | { type: "circle" };

    const markerMap: Marker[][] = Array.from({ length: share.boardSize }, () =>
        Array.from({ length: share.boardSize }, () => null)
    );

    const lastMove = share.gameState.moves.at(-1);
    if (lastMove?.type === "play") {
        markerMap[lastMove.y][lastMove.x] = { type: "circle" };
    }

    const sgfFilename = createSgfFilename(
        share.blackPlayerName,
        share.whitePlayerName
    );

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
            >
                <div className="relative">
                    <div className="absolute right-1 top-1 z-10 flex gap-2">
                        <button
                            type="button"
                            className="rounded bg-slate-700 px-3 py-2 text-white hover:bg-slate-600"
                            onClick={() => {
                                const sgf = exportSgf({
                                    boardSize: share.boardSize,
                                    moves: share.gameState.moves,
                                    setupStones: share.gameState.setupStones,
                                    handicap: share.handicap,
                                    blackPlayerName: share.blackPlayerName,
                                    whitePlayerName: share.whitePlayerName,
                                });

                                const blob = new Blob([sgf], {
                                    type: "application/x-go-sgf;charset=utf-8",
                                });

                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");

                                link.href = url;
                                link.download = sgfFilename;
                                link.click();

                                URL.revokeObjectURL(url);
                            }}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Download size={18} />
                                <span>SGF</span>
                            </div>
                        </button>
                    </div>

                    <BoardView
                        vertexSize={vertexSize}
                        signMap={signMap}
                        markerMap={markerMap}
                        showCoordinates
                    />
                </div>
            </div>
        </div>
    );
}
