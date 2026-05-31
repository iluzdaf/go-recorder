import type { ShareRecord } from "../components/types";
import type { CreateLocalGameInput } from "./localGames";

export function toForkedLocalGameInput(
    share: ShareRecord
): CreateLocalGameInput {
    return {
        boardSize: share.boardSize,
        gameState: share.gameState,
        blackPlayerName: share.blackPlayerName,
        whitePlayerName: share.whitePlayerName,
        handicap: share.handicap,
    };
}
