import type {
    BoardSize,
    DraftKind,
    GameState,
    LocalDraftRecord,
    LocalEditableRecord,
    LocalGameRecord,
    PositionView,
} from "../components/types";
import { isValidBoardSize, isValidGameState } from "./gameLogic";
import { isValidPositionView } from "./positionView";
import { createRandomId } from "./randomId";

const LOCAL_GAME_STORAGE_KEY_PREFIX = "go-recorder:local-game:";

export type { LocalDraftRecord, LocalEditableRecord, LocalGameRecord };

export type CreateLocalGameInput = {
    boardSize: BoardSize;
    gameState: GameState;
    blackPlayerName?: string | null;
    whitePlayerName?: string | null;
    handicap?: number;
};

export type CreateLocalDraftInput = {
    draftKind: DraftKind;
    boardSize: BoardSize;
    gameState: GameState;
    blackPlayerName?: string | null;
    whitePlayerName?: string | null;
    handicap?: number;
    parentShareSlug?: string | null;
    baseMoveCount?: number | null;
    positionView?: PositionView | null;
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

function isNullableString(value: unknown) {
    return value === null || typeof value === "string";
}

function isOptionalNullableString(value: unknown) {
    return value === undefined || isNullableString(value);
}

function isValidBaseMoveCount(value: unknown) {
    return (
        value === null ||
        (typeof value === "number" && Number.isInteger(value) && value >= 0)
    );
}

function isOptionalPositionView(
    value: unknown,
    boardSize: BoardSize | undefined
) {
    return (
        value === undefined ||
        value === null ||
        (isValidBoardSize(boardSize) && isValidPositionView(value, boardSize))
    );
}

function hasValidLocalRecordBase(
    record: Partial<LocalEditableRecord>
) {
    return (
        typeof record.id === "string" &&
        isValidBoardSize(record.boardSize) &&
        isValidGameState(record.gameState) &&
        isNullableString(record.blackPlayerName) &&
        isNullableString(record.whitePlayerName) &&
        typeof record.handicap === "number" &&
        Number.isInteger(record.handicap) &&
        typeof record.createdAt === "string" &&
        typeof record.updatedAt === "string" &&
        isOptionalNullableString(record.lastShareSlug)
    );
}

function isLocalGameRecord(value: unknown): value is LocalGameRecord {
    if (typeof value !== "object" || value === null) return false;

    const record = value as Partial<LocalGameRecord>;

    return (
        (record.recordKind === undefined || record.recordKind === "game") &&
        hasValidLocalRecordBase(record)
    );
}

function isLocalDraftRecord(value: unknown): value is LocalDraftRecord {
    if (typeof value !== "object" || value === null) return false;

    const record = value as Partial<LocalDraftRecord>;

    if (
        record.recordKind !== "draft" ||
        (record.draftKind !== "board" && record.draftKind !== "variation") ||
        !hasValidLocalRecordBase(record) ||
        !isNullableString(record.parentShareSlug) ||
        !isValidBaseMoveCount(record.baseMoveCount) ||
        !isOptionalPositionView(record.positionView, record.boardSize)
    ) {
        return false;
    }

    if (record.draftKind === "variation") {
        return (
            typeof record.parentShareSlug === "string" &&
            record.parentShareSlug.length > 0 &&
            typeof record.baseMoveCount === "number" &&
            (record.positionView === undefined || record.positionView === null)
        );
    }

    return record.parentShareSlug === null && record.baseMoveCount === null;
}

function isLocalEditableRecord(value: unknown): value is LocalEditableRecord {
    return isLocalGameRecord(value) || isLocalDraftRecord(value);
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
        recordKind: "game",
        id: createRandomId(),
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

export function createLocalDraft({
    draftKind,
    boardSize,
    gameState,
    blackPlayerName = null,
    whitePlayerName = null,
    handicap = 0,
    parentShareSlug = null,
    baseMoveCount = null,
    positionView = null,
}: CreateLocalDraftInput) {
    const now = new Date().toISOString();
    const record: LocalDraftRecord = {
        recordKind: "draft",
        draftKind,
        id: createRandomId(),
        boardSize,
        gameState,
        blackPlayerName,
        whitePlayerName,
        handicap,
        createdAt: now,
        updatedAt: now,
        lastShareSlug: null,
        parentShareSlug,
        baseMoveCount,
        positionView: draftKind === "board" ? positionView : null,
    };

    if (!isLocalDraftRecord(record)) {
        throw new Error("Invalid local draft record");
    }

    getLocalStorage().setItem(getStorageKey(record.id), JSON.stringify(record));

    return record;
}

export function getLocalGame(id: string) {
    const record = getLocalRecord(id);

    return record?.recordKind === "draft" ? null : record;
}

export function getLocalRecord(id: string) {
    const storedRecord = getLocalStorage().getItem(getStorageKey(id));

    if (storedRecord === null) return null;

    try {
        const parsedRecord: unknown = JSON.parse(storedRecord);

        if (!isLocalEditableRecord(parsedRecord)) return null;

        return parsedRecord;
    } catch {
        return null;
    }
}

export function saveLocalGame(record: LocalGameRecord) {
    const updatedRecord = saveLocalRecord(record);

    if (updatedRecord.recordKind === "draft") {
        throw new Error("Expected a local game record");
    }

    return updatedRecord;
}

export function saveLocalRecord(record: LocalEditableRecord) {
    const updatedRecord: LocalEditableRecord = {
        ...record,
        updatedAt: new Date().toISOString(),
    };

    getLocalStorage().setItem(
        getStorageKey(updatedRecord.id),
        JSON.stringify(updatedRecord)
    );

    return updatedRecord;
}
