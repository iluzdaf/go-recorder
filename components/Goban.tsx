"use client";

import { useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type { ComponentType } from "react";

import type { GameState, Move } from "./types";

const Goban = ShudanGoban as unknown as ComponentType<any>;

export default function GoBoard() {
    const size = 19;

    const [gameState, setGameState] = useState<GameState>({
        moves: [],
        currentPlayer: "B",
    });

    const signMap = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => 0)
    );

    for (const move of gameState.moves) {
        signMap[move.y][move.x] = move.color === "B" ? 1 : -1;
    }

    return (
        <div className="p-4">
            <Goban
                vertexSize={24}
                signMap={signMap}
                onVertexClick={(event: unknown, [x, y]: [number, number]) => {
                    const occupied = gameState.moves.some(
                        (move) => move.x === x && move.y === y
                    );

                    if (occupied) return;

                    const newMove: Move = {
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