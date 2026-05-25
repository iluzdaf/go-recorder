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