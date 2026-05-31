import type {
    BoardSize,
    GameState,
    LocalGameRecord,
} from "../components/types";
import { isValidBoardSize, isValidGameState } from "./gameLogic";

const LOCAL_GAME_STORAGE_KEY_PREFIX = "go-recorder:local-game:";

export type { LocalGameRecord };

export type CreateLocalGameInput = {
    boardSize: BoardSize;
    gameState: GameState;
    blackPlayerName?: string | null;
    whitePlayerName?: string | null;
    handicap?: number;
};

function getLocalStorage() {
    if (typeof window === "undefined") {
        throw new Error("Local game storage is only available in the browser");
    }

    return window.localStorage;
}

function getStorageKey(id: string) {
    return `${LOCAL_GAME_STORAGE_KEY_PREFIX}${id}`;
}

function isLocalGameRecord(value: unknown): value is LocalGameRecord {
    if (typeof value !== "object" || value === null) return false;

    const record = value as Partial<LocalGameRecord>;

    return (
        typeof record.id === "string" &&
        isValidBoardSize(record.boardSize) &&
        isValidGameState(record.gameState) &&
        (typeof record.blackPlayerName === "string" ||
            record.blackPlayerName === null) &&
        (typeof record.whitePlayerName === "string" ||
            record.whitePlayerName === null) &&
        typeof record.handicap === "number" &&
        Number.isInteger(record.handicap) &&
        typeof record.createdAt === "string" &&
        typeof record.updatedAt === "string" &&
        (record.lastShareSlug === undefined ||
            typeof record.lastShareSlug === "string" ||
            record.lastShareSlug === null)
    );
}

export function createLocalGame({
    boardSize,
    gameState,
    blackPlayerName = null,
    whitePlayerName = null,
    handicap = 0,
}: CreateLocalGameInput) {
    const now = new Date().toISOString();
    const record: LocalGameRecord = {
        id: crypto.randomUUID(),
        boardSize,
        gameState,
        blackPlayerName,
        whitePlayerName,
        handicap,
        createdAt: now,
        updatedAt: now,
        lastShareSlug: null,
    };

    getLocalStorage().setItem(getStorageKey(record.id), JSON.stringify(record));

    return record;
}

export function getLocalGame(id: string) {
    const storedRecord = getLocalStorage().getItem(getStorageKey(id));

    if (storedRecord === null) return null;

    try {
        const parsedRecord: unknown = JSON.parse(storedRecord);

        if (!isLocalGameRecord(parsedRecord)) return null;

        return parsedRecord;
    } catch {
        return null;
    }
}

export function saveLocalGame(record: LocalGameRecord) {
    const updatedRecord: LocalGameRecord = {
        ...record,
        updatedAt: new Date().toISOString(),
    };

    getLocalStorage().setItem(
        getStorageKey(updatedRecord.id),
        JSON.stringify(updatedRecord)
    );

    return updatedRecord;
}
