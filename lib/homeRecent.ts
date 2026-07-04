import {
    getAllLocalDrafts,
    getAllLocalGames,
    type LocalDraftRecord,
    type LocalGameRecord,
} from "./localGames";

export const HOME_RECENT_LIMIT = 3;

export type HomeRecentState =
    | {
          status: "loading";
          games: [];
          drafts: [];
      }
    | {
          status: "ready";
          games: LocalGameRecord[];
          drafts: LocalDraftRecord[];
      };

export type HomeRecentPreview<TRecord extends LocalGameRecord | LocalDraftRecord> = {
    previewKey: string;
    record: TRecord;
    title: string;
};

export function createLoadingHomeRecentState(): HomeRecentState {
    return {
        status: "loading",
        games: [],
        drafts: [],
    };
}

export function loadHomeRecentState({
    limit = HOME_RECENT_LIMIT,
    loadGames = getAllLocalGames,
    loadDrafts = getAllLocalDrafts,
}: {
    limit?: number;
    loadGames?: () => LocalGameRecord[];
    loadDrafts?: () => LocalDraftRecord[];
} = {}): HomeRecentState {
    return {
        status: "ready",
        games: loadGames().slice(0, limit),
        drafts: loadDrafts().slice(0, limit),
    };
}

export function shouldRenderHomeRecentSection(
    state: HomeRecentState,
    records: readonly LocalGameRecord[] | readonly LocalDraftRecord[]
) {
    return state.status === "loading" || records.length > 0;
}

export function createHomeRecentPreviews<
    TRecord extends LocalGameRecord | LocalDraftRecord,
>(
    records: readonly TRecord[],
    getTitle: (record: TRecord) => string
): HomeRecentPreview<TRecord>[] {
    return records.map((record) => ({
        previewKey: `${record.id}:${record.updatedAt}`,
        record,
        title: getTitle(record),
    }));
}
