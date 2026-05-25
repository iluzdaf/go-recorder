import type { Move } from "../components/types";

export function toSgfCoord(x: number, y: number) {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    return `${letters[x]}${letters[y]}`;
}

export function exportSgf(boardSize: number, moves: Move[]) {
    const moveText = moves
        .map((move) => {
            if (move.type === "pass") {
                return `;${move.color}[]`;
            }

            return `;${move.color}[${toSgfCoord(move.x, move.y)}]`;
        })
        .join("");

    return `(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[${boardSize}]${moveText})`;
}
