import { LOCAL_DATA_MIGRATION_CHANGE_EVENT } from "./localDataMigration";
import { deleteLocalRecord } from "./localGames";

export function deleteLocalEditableRecord(id: string) {
    deleteLocalRecord(id);

    if (typeof window === "undefined") return;

    window.dispatchEvent(new Event(LOCAL_DATA_MIGRATION_CHANGE_EVENT));
}
