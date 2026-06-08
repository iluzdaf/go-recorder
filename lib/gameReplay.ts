import type {
    BoardSize,
    GameState,
    Move,
    SetupStone,
    Stone,
} from "../components/types";

// @sabaki/go-board does not ship complete ESM/TypeScript support.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Board = require("@sabaki/go-board");

export type GoBoard = {
    signMap: number[][];
    makeMove: (
        sign: -1 | 1,
        vertex: [number, number],
        options?: {
            preventOverwrite?: boolean;
            preventSuicide?: boolean;
            preventKo?: boolean;
        }
    ) => GoBoard;
};

export type StoneOwner =
    | {
        type: "setup";
        setupIndex: number;
    }
    | {
        type: "move";
        moveIndex: number;
    };

export type ReplayMoveRecord = {
    moveIndex: number;
    move: Move;
    boardBefore: GoBoard;
    boardAfter: GoBoard;
    capturedMoveIndexes: number[];
    legal: boolean;
    error: string | null;
};

export type GameReplay = {
    board: GoBoard;
    moveRecords: ReplayMoveRecord[];
    visibleStoneOwners: (StoneOwner | null)[][];
    legal: boolean;
    error: string | null;
};

function stoneToSign(stone: Stone): -1 | 1 {
    return stone === "B" ? 1 : -1;
}

export function getOppositeStone(stone: Stone): Stone {
    return stone === "B" ? "W" : "B";
}

export function getNextMoveColor({
    fallbackCurrentPlayer,
    moves,
}: {
    fallbackCurrentPlayer: Stone;
    moves: Move[];
}): Stone {
    const lastMove = moves.at(-1);

    return lastMove ? getOppositeStone(lastMove.color) : fallbackCurrentPlayer;
}

function createEmptyOwners(boardSize: BoardSize) {
    return Array.from({ length: boardSize }, () =>
        Array.from<StoneOwner | null>({ length: boardSize }).fill(null)
    );
}

function cloneOwners(owners: (StoneOwner | null)[][]) {
    return owners.map((row) => [...row]);
}

function getCapturedMoveIndexes({
    boardAfter,
    ownersBefore,
}: {
    boardAfter: GoBoard;
    ownersBefore: (StoneOwner | null)[][];
}) {
    const capturedMoveIndexes = new Set<number>();

    for (let y = 0; y < ownersBefore.length; y += 1) {
        for (let x = 0; x < ownersBefore[y].length; x += 1) {
            const owner = ownersBefore[y][x];

            if (owner?.type !== "move") continue;
            if (boardAfter.signMap[y][x] !== 0) continue;

            capturedMoveIndexes.add(owner.moveIndex);
        }
    }

    return [...capturedMoveIndexes].sort((a, b) => a - b);
}

function syncOwnersWithBoard({
    board,
    owners,
}: {
    board: GoBoard;
    owners: (StoneOwner | null)[][];
}) {
    for (let y = 0; y < owners.length; y += 1) {
        for (let x = 0; x < owners[y].length; x += 1) {
            if (board.signMap[y][x] === 0) {
                owners[y][x] = null;
            }
        }
    }
}

export function replayGame({
    boardSize,
    setupStones,
    moves,
}: {
    boardSize: BoardSize;
    setupStones: SetupStone[];
    moves: Move[];
}): GameReplay {
    let board = Board.fromDimensions(boardSize) as GoBoard;
    const owners = createEmptyOwners(boardSize);
    const moveRecords: ReplayMoveRecord[] = [];

    for (let setupIndex = 0; setupIndex < setupStones.length; setupIndex += 1) {
        const setupStone = setupStones[setupIndex];

        try {
            board = board.makeMove(
                stoneToSign(setupStone.color),
                [setupStone.x, setupStone.y],
                {
                    preventOverwrite: true,
                    preventSuicide: true,
                    preventKo: false,
                }
            );
            owners[setupStone.y][setupStone.x] = {
                type: "setup",
                setupIndex,
            };
            syncOwnersWithBoard({ board, owners });
        } catch (error) {
            return {
                board,
                moveRecords,
                visibleStoneOwners: owners,
                legal: false,
                error: error instanceof Error ? error.message : "Invalid setup stone",
            };
        }
    }

    for (let moveIndex = 0; moveIndex < moves.length; moveIndex += 1) {
        const move = moves[moveIndex];
        const boardBefore = board;
        const ownersBefore = cloneOwners(owners);

        if (move.type === "pass") {
            moveRecords.push({
                moveIndex,
                move,
                boardBefore,
                boardAfter: board,
                capturedMoveIndexes: [],
                legal: true,
                error: null,
            });
            continue;
        }

        try {
            board = board.makeMove(stoneToSign(move.color), [move.x, move.y], {
                preventOverwrite: true,
                preventSuicide: true,
                preventKo: true,
            });

            const capturedMoveIndexes = getCapturedMoveIndexes({
                boardAfter: board,
                ownersBefore,
            });

            owners[move.y][move.x] = {
                type: "move",
                moveIndex,
            };
            syncOwnersWithBoard({ board, owners });

            moveRecords.push({
                moveIndex,
                move,
                boardBefore,
                boardAfter: board,
                capturedMoveIndexes,
                legal: true,
                error: null,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid move";

            moveRecords.push({
                moveIndex,
                move,
                boardBefore,
                boardAfter: boardBefore,
                capturedMoveIndexes: [],
                legal: false,
                error: message,
            });

            return {
                board: boardBefore,
                moveRecords,
                visibleStoneOwners: ownersBefore,
                legal: false,
                error: message,
            };
        }
    }

    return {
        board,
        moveRecords,
        visibleStoneOwners: owners,
        legal: true,
        error: null,
    };
}

export function playGameMove({
    board,
    gameState,
    x,
    y,
}: {
    board: GoBoard;
    gameState: GameState;
    x: number;
    y: number;
}):
    | {
        ok: true;
        gameState: GameState;
        move: Move & { type: "play" };
    }
    | {
        ok: false;
        error: string;
    } {
    try {
        board.makeMove(stoneToSign(gameState.currentPlayer), [x, y], {
            preventOverwrite: true,
            preventSuicide: true,
            preventKo: true,
        });
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Invalid move",
        };
    }

    const move: Move & { type: "play" } = {
        type: "play",
        x,
        y,
        color: gameState.currentPlayer,
    };

    return {
        ok: true,
        gameState: {
            ...gameState,
            moves: [...gameState.moves, move],
            currentPlayer: getOppositeStone(gameState.currentPlayer),
        },
        move,
    };
}
