import type {
    BoardSize,
    CreateShareInput,
    DraftKind,
    GameState,
    Move,
    PositionView,
    SetupStone,
    ShareSourceKind,
    Stone,
} from "../components/types";
import { isValidBoardSize } from "./gameLogic";
import { isValidPositionView } from "./positionView";

function isStone(value: unknown): value is Stone {
    return value === "B" || value === "W";
}

function isShareSourceKind(value: unknown): value is ShareSourceKind {
    return value === "game" || value === "draft";
}

function isDraftKind(value: unknown): value is DraftKind {
    return value === "board" || value === "variation";
}

function isIntegerInBoardBounds(value: unknown, boardSize: BoardSize) {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        value < boardSize
    );
}

function isSetupStone(value: unknown, boardSize: BoardSize): value is SetupStone {
    if (typeof value !== "object" || value === null) return false;

    const setupStone = value as Partial<SetupStone>;

    return (
        isIntegerInBoardBounds(setupStone.x, boardSize) &&
        isIntegerInBoardBounds(setupStone.y, boardSize) &&
        isStone(setupStone.color)
    );
}

function isMove(value: unknown, boardSize: BoardSize): value is Move {
    if (typeof value !== "object" || value === null) return false;

    const move = value as Partial<Move>;

    if (!isStone(move.color)) return false;

    if (move.type === "pass") {
        return true;
    }

    return (
        move.type === "play" &&
        isIntegerInBoardBounds(move.x, boardSize) &&
        isIntegerInBoardBounds(move.y, boardSize)
    );
}

function isGameState(value: unknown, boardSize: BoardSize): value is GameState {
    if (typeof value !== "object" || value === null) return false;

    const gameState = value as Partial<GameState>;

    return (
        Array.isArray(gameState.setupStones) &&
        gameState.setupStones.every((setupStone) =>
            isSetupStone(setupStone, boardSize)
        ) &&
        Array.isArray(gameState.moves) &&
        gameState.moves.every((move) => isMove(move, boardSize)) &&
        isStone(gameState.currentPlayer)
    );
}

function isOptionalPlayerName(value: unknown): value is string | null {
    return value === null || typeof value === "string";
}

function isValidHandicap(value: unknown) {
    return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isNullableString(value: unknown) {
    return value === null || typeof value === "string";
}

function isValidBaseMoveCount(value: unknown) {
    return (
        value === null ||
        (typeof value === "number" && Number.isInteger(value) && value >= 0)
    );
}

function isNullablePositionView(
    value: unknown,
    boardSize: BoardSize | undefined
): value is PositionView | null | undefined {
    return (
        value === undefined ||
        value === null ||
        (isValidBoardSize(boardSize) && isValidPositionView(value, boardSize))
    );
}

function hasValidShareDraftMetadata(input: Partial<CreateShareInput>) {
    const draftKind = input.draftKind ?? null;
    const parentShareSlug = input.parentShareSlug ?? null;
    const baseMoveCount = input.baseMoveCount ?? null;
    const positionView = input.positionView ?? null;

    if (input.sourceKind === "game") {
        return (
            draftKind === null &&
            parentShareSlug === null &&
            baseMoveCount === null &&
            positionView === null
        );
    }

    if (draftKind === null) {
        return (
            parentShareSlug === null &&
            baseMoveCount === null &&
            positionView === null
        );
    }

    if (!isDraftKind(draftKind)) return false;
    if (!isNullableString(parentShareSlug)) return false;
    if (!isValidBaseMoveCount(baseMoveCount)) return false;

    if (draftKind === "variation") {
        return (
            typeof parentShareSlug === "string" &&
            parentShareSlug.length > 0 &&
            typeof baseMoveCount === "number" &&
            positionView === null
        );
    }

    return (
        parentShareSlug === null &&
        baseMoveCount === null &&
        isNullablePositionView(positionView, input.boardSize)
    );
}

export function validateCreateShareInput(
    value: unknown
): value is CreateShareInput {
    if (typeof value !== "object" || value === null) return false;

    const input = value as Partial<CreateShareInput>;

    return (
        isShareSourceKind(input.sourceKind) &&
        isValidBoardSize(input.boardSize) &&
        isGameState(input.gameState, input.boardSize) &&
        isOptionalPlayerName(input.blackPlayerName) &&
        isOptionalPlayerName(input.whitePlayerName) &&
        isValidHandicap(input.handicap) &&
        hasValidShareDraftMetadata(input)
    );
}
