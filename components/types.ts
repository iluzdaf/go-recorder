export type Stone = "B" | "W";

export type Move = {
    x: number;
    y: number;
    color: Stone;
};

export type GameState = {
    moves: Move[];
    currentPlayer: Stone;
};