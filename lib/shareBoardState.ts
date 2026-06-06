import type { Move, SetupStone, Stone } from "../components/types";

// @sabaki/go-board does not ship TypeScript types, so keep the boundary small.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Board = require("@sabaki/go-board");

function stoneToSign(stone: Stone) {
    return stone === "B" ? 1 : -1;
}

export function buildBoardFromGameState(
    size: number,
    setupStones: SetupStone[],
    moves: Move[]
) {
    let board = Board.fromDimensions(size);

    for (const setupStone of setupStones) {
        board = board.makeMove(
            stoneToSign(setupStone.color),
            [setupStone.x, setupStone.y],
            {
                preventOverwrite: true,
                preventSuicide: true,
                preventKo: false,
            }
        );
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
