export type Stone = "B" | "W";

export type Move =
    | {
        type: "play";
        x: number;
        y: number;
        color: Stone;
    }
    | {
        type: "pass";
        color: Stone;
    };

export type GameState = {
    moves: Move[];
    currentPlayer: Stone;
};

export type BoardSize = 9 | 13 | 19;

export type GameRecord = {
    slug: string;
    boardSize: BoardSize;
    gameState: GameState;
    createdAt: string;
    updatedAt: string;
};