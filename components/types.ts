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

export type SetupStone = {
    x: number;
    y: number;
    color: Stone;
};

export type GameState = {
    setupStones: SetupStone[];
    moves: Move[];
    currentPlayer: Stone;
};

export type BoardSize = 9 | 13 | 19;

export type ShareSourceKind = "game" | "draft";

export type GameRecord = {
    slug: string;
    boardSize: BoardSize;
    gameState: GameState;
    blackPlayerName: string | null;
    whitePlayerName: string | null;
    handicap: number;
    createdAt: string;
    updatedAt: string;
};

export type LocalGameRecord = {
    id: string;
    boardSize: BoardSize;
    gameState: GameState;
    blackPlayerName: string | null;
    whitePlayerName: string | null;
    handicap: number;
    createdAt: string;
    updatedAt: string;
    lastShareSlug?: string | null;
};

export type ShareRecord = {
    slug: string;
    sourceKind: ShareSourceKind;
    boardSize: BoardSize;
    gameState: GameState;
    blackPlayerName: string | null;
    whitePlayerName: string | null;
    handicap: number;
    createdAt: string;
};

export type CreateShareInput = {
    sourceKind: ShareSourceKind;
    boardSize: BoardSize;
    gameState: GameState;
    blackPlayerName: string | null;
    whitePlayerName: string | null;
    handicap: number;
};

export type CreateShareResponse = {
    slug: string;
};
