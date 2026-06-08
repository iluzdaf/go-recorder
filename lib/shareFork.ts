import type { ShareRecord } from "../components/types";
import {
    getNextMoveColor,
    playGameMove,
    replayGame,
} from "./gameReplay";
import type { CreateLocalDraftInput, CreateLocalGameInput } from "./localGames";

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

export function toVariationDraftInput({
    share,
    vertex,
    visibleMoveCount,
}: {
    share: ShareRecord;
    vertex: { x: number; y: number };
    visibleMoveCount: number;
}):
    | {
        ok: true;
        input: CreateLocalDraftInput;
    }
    | {
        ok: false;
        error: string;
    } {
    const visibleMoves = share.gameState.moves.slice(0, visibleMoveCount);
    const fallbackCurrentPlayer =
        share.gameState.moves[0]?.color ?? share.gameState.currentPlayer;
    const gameState = {
        setupStones: share.gameState.setupStones,
        moves: visibleMoves,
        currentPlayer: getNextMoveColor({
            fallbackCurrentPlayer,
            moves: visibleMoves,
        }),
    };
    const replay = replayGame({
        boardSize: share.boardSize,
        setupStones: gameState.setupStones,
        moves: gameState.moves,
    });

    if (!replay.legal) {
        return {
            ok: false,
            error: replay.error ?? "Invalid base position",
        };
    }

    const playResult = playGameMove({
        board: replay.board,
        gameState,
        x: vertex.x,
        y: vertex.y,
    });

    if (!playResult.ok) {
        return playResult;
    }

    return {
        ok: true,
        input: {
            draftKind: "variation",
            boardSize: share.boardSize,
            gameState: playResult.gameState,
            blackPlayerName: share.blackPlayerName,
            whitePlayerName: share.whitePlayerName,
            handicap: share.handicap,
            parentShareSlug: share.slug,
            baseMoveCount: visibleMoveCount,
        },
    };
}
