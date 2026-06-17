import GoBoard from "@sabaki/go-board";

import type { BoardSize, SetupStone } from "../components/types";

export function getNoLibertyVertices({
    boardSize,
    setupStones,
}: {
    boardSize: BoardSize;
    setupStones: SetupStone[];
}): [number, number][] {
    const signMap: (0 | 1 | -1)[][] = Array.from({ length: boardSize }, () =>
        Array.from({ length: boardSize }, () => 0 as const)
    );
    for (const s of setupStones) {
        signMap[s.y][s.x] = s.color === "B" ? 1 : -1;
    }

    const board = new GoBoard(signMap);
    const seen = new Set<string>();
    const result: [number, number][] = [];

    for (const { x, y } of setupStones) {
        const key = `${x},${y}`;
        if (seen.has(key)) continue;
        if (!board.hasLiberties([x, y])) {
            for (const [cx, cy] of board.getChain([x, y])) {
                seen.add(`${cx},${cy}`);
                result.push([cx, cy]);
            }
        }
    }

    return result;
}

export function hasNoLibertyGroups({
    boardSize,
    setupStones,
}: {
    boardSize: BoardSize;
    setupStones: SetupStone[];
}): boolean {
    return getNoLibertyVertices({ boardSize, setupStones }).length > 0;
}
