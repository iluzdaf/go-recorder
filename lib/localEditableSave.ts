import type {
    BoardSize,
    GameState,
    LocalEditableRecord,
} from "../components/types";
import { saveLocalRecord } from "./localGames";

type SaveLocalEditableRecordInput<T extends LocalEditableRecord> = {
    boardSize?: BoardSize;
    clearShareSlug?: boolean;
    gameState?: GameState;
    record: T;
};

export function createLocalEditableSaveRecord<T extends LocalEditableRecord>({
    boardSize,
    clearShareSlug = false,
    gameState,
    record,
}: SaveLocalEditableRecordInput<T>): T {
    return {
        ...record,
        ...(boardSize === undefined ? {} : { boardSize }),
        ...(gameState === undefined ? {} : { gameState }),
        ...(clearShareSlug ? { lastShareSlug: null } : {}),
    } as T;
}

export function saveLocalEditableRecord<T extends LocalEditableRecord>(
    input: SaveLocalEditableRecordInput<T>
): T {
    return saveLocalRecord(createLocalEditableSaveRecord(input)) as T;
}
