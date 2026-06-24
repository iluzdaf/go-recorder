import type {
    BoardSize,
    GameState,
    LocalEditableRecord,
} from "../components/types";
import { saveLocalRecord } from "./localGames";

type SaveLocalEditableRecordInput<T extends LocalEditableRecord> = {
    blackPlayerName?: string | null;
    boardSize?: BoardSize;
    clearShareSlug?: boolean;
    gameState?: GameState;
    komi?: number;
    record: T;
    whitePlayerName?: string | null;
};

export function createLocalEditableSaveRecord<T extends LocalEditableRecord>({
    blackPlayerName,
    boardSize,
    clearShareSlug = false,
    gameState,
    komi,
    record,
    whitePlayerName,
}: SaveLocalEditableRecordInput<T>): T {
    return {
        ...record,
        ...(blackPlayerName === undefined ? {} : { blackPlayerName }),
        ...(boardSize === undefined ? {} : { boardSize }),
        ...(gameState === undefined ? {} : { gameState }),
        ...(komi === undefined ? {} : { komi }),
        ...(whitePlayerName === undefined ? {} : { whitePlayerName }),
        ...(clearShareSlug ? { lastShareSlug: null } : {}),
    } as T;
}

export function saveLocalEditableRecord<T extends LocalEditableRecord>(
    input: SaveLocalEditableRecordInput<T>
): T {
    return saveLocalRecord(createLocalEditableSaveRecord(input)) as T;
}
