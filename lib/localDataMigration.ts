import type {
    ImageSourceMetadata,
    LocalDraftRecord,
    LocalGameRecord,
    LocalEditableRecord,
} from "../components/types";
import { isValidGameState } from "./gameLogic";
import { isValidPositionView } from "./positionView";
import { createRandomId } from "./randomId";
import {
    deleteImageSource,
    getImageSource,
    storeImageSource,
} from "./localImageStorage";
import {
    deleteLocalRecord,
    getAllLocalDrafts,
    getAllLocalGames,
    writeImportedLocalRecord,
} from "./localGames";

export type LocalDataExportPayload = {
    version: 1;
    exportedAt: string;
    games: LocalGameRecord[];
    drafts: LocalDraftRecord[];
    imageSources: ImageSourceMetadata[];
    missingImageSourceIds: string[];
};

export type LocalDataImportResult = {
    gamesImported: number;
    draftsImported: number;
    imageSourcesImported: number;
    missingImageSourceIds: string[];
};

export const LOCAL_DATA_MIGRATION_CHANGE_EVENT =
    "go-recorder:local-data-change";

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown) {
    return value === null || typeof value === "string";
}

function isFiniteNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value);
}

function isIntegerNumber(value: unknown) {
    return typeof value === "number" && Number.isInteger(value);
}

function isValidBaseMoveCount(value: unknown) {
    return value === null || (isIntegerNumber(value) && value >= 0);
}

function isValidImageSourceMetadata(value: unknown): value is ImageSourceMetadata {
    if (!isPlainObject(value)) return false;
    if (typeof value.id !== "string") return false;
    if (typeof value.dataUrl !== "string") return false;
    if (!isFiniteNumber(value.naturalWidth) || value.naturalWidth <= 0) {
        return false;
    }
    if (!isFiniteNumber(value.naturalHeight) || value.naturalHeight <= 0) {
        return false;
    }
    if (!Array.isArray(value.corners) || value.corners.length !== 4) {
        return false;
    }

    return value.corners.every(
        (corner) =>
            isPlainObject(corner) &&
            isFiniteNumber(corner.x) &&
            isFiniteNumber(corner.y)
    );
}

function isValidImportedGameRecord(value: unknown): value is LocalGameRecord {
    if (!isPlainObject(value)) return false;
    if (value.recordKind !== undefined && value.recordKind !== "game") {
        return false;
    }
    return (
        typeof value.id === "string" &&
        isValidGameState(value.gameState) &&
        [9, 13, 19].includes(value.boardSize) &&
        isNullableString(value.blackPlayerName) &&
        isNullableString(value.whitePlayerName) &&
        isIntegerNumber(value.handicap) &&
        (value.komi === undefined || isFiniteNumber(value.komi)) &&
        typeof value.createdAt === "string" &&
        typeof value.updatedAt === "string" &&
        isNullableString(value.lastShareSlug)
    );
}

function isValidImportedDraftRecord(value: unknown): value is LocalDraftRecord {
    if (!isPlainObject(value)) return false;
    if (value.recordKind !== "draft") return false;
    if (value.draftKind !== "board" && value.draftKind !== "variation") {
        return false;
    }

    return (
        typeof value.id === "string" &&
        isValidGameState(value.gameState) &&
        [9, 13, 19].includes(value.boardSize) &&
        isNullableString(value.blackPlayerName) &&
        isNullableString(value.whitePlayerName) &&
        isIntegerNumber(value.handicap) &&
        (value.komi === undefined || isFiniteNumber(value.komi)) &&
        typeof value.createdAt === "string" &&
        typeof value.updatedAt === "string" &&
        isNullableString(value.lastShareSlug) &&
        isNullableString(value.parentShareSlug) &&
        isValidBaseMoveCount(value.baseMoveCount) &&
        (value.positionView === undefined ||
            value.positionView === null ||
            (typeof value.boardSize === "number" &&
                isValidPositionView(value.positionView, value.boardSize))) &&
        (value.imageSourceId === undefined ||
            value.imageSourceId === null ||
            typeof value.imageSourceId === "string")
    );
}

function isValidLocalDataExportPayload(
    value: unknown
): value is LocalDataExportPayload {
    if (!isPlainObject(value)) return false;
    if (value.version !== 1) return false;
    if (typeof value.exportedAt !== "string") return false;
    if (!Array.isArray(value.games) || !Array.isArray(value.drafts)) {
        return false;
    }
    if (!Array.isArray(value.imageSources)) return false;
    if (
        value.missingImageSourceIds !== undefined &&
        !Array.isArray(value.missingImageSourceIds)
    ) {
        return false;
    }

    return (
        value.games.every(isValidImportedGameRecord) &&
        value.drafts.every(isValidImportedDraftRecord) &&
        value.imageSources.every(isValidImageSourceMetadata) &&
        (value.missingImageSourceIds ?? []).every((id) => typeof id === "string")
    );
}

function createExportedImageSourceIds(records: LocalEditableRecord[]) {
    const ids = new Set<string>();

    for (const record of records) {
        if (record.recordKind !== "draft") continue;
        if (typeof record.imageSourceId !== "string") continue;
        ids.add(record.imageSourceId);
    }

    return ids;
}

export async function exportLocalData(): Promise<LocalDataExportPayload> {
    const games = getAllLocalGames();
    const drafts = getAllLocalDrafts();
    const records: LocalEditableRecord[] = [...games, ...drafts];
    const imageSourceIds = createExportedImageSourceIds(records);
    const imageSources: ImageSourceMetadata[] = [];
    const missingImageSourceIds: string[] = [];

    for (const imageSourceId of imageSourceIds) {
        const imageSource = await getImageSource(imageSourceId);

        if (imageSource) {
            imageSources.push(imageSource);
        } else {
            missingImageSourceIds.push(imageSourceId);
        }
    }

    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        games,
        drafts,
        imageSources,
        missingImageSourceIds,
    };
}

function createLocalDataFilename(now = new Date()) {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `go-recorder-local-data-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export async function downloadLocalDataExport() {
    const payload = await exportLocalData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = createLocalDataFilename();
    link.click();
    URL.revokeObjectURL(url);

    return payload;
}

function remapImportedImageSourceId(
    imageSourceId: string | null | undefined,
    imageSourceIdMap: Map<string, string>
) {
    if (typeof imageSourceId !== "string") return imageSourceId ?? null;

    return imageSourceIdMap.get(imageSourceId) ?? null;
}

export async function importLocalDataFromText(
    rawValue: string
): Promise<LocalDataImportResult> {
    let parsed: unknown;

    try {
        parsed = JSON.parse(rawValue);
    } catch {
        throw new Error("Invalid local data export file");
    }

    if (!isValidLocalDataExportPayload(parsed)) {
        throw new Error("Invalid local data export file");
    }

    const imageSourceIdMap = new Map<string, string>();
    const importedLocalRecordIds: string[] = [];
    const importedImageSourceIds: string[] = [];

    try {
        for (const imageSource of parsed.imageSources) {
            const importedImageSourceId = await storeImageSource({
                dataUrl: imageSource.dataUrl,
                naturalHeight: imageSource.naturalHeight,
                naturalWidth: imageSource.naturalWidth,
                corners: imageSource.corners,
            });

            imageSourceIdMap.set(imageSource.id, importedImageSourceId);
            importedImageSourceIds.push(importedImageSourceId);
        }

        for (const record of parsed.games) {
            const importedGame: LocalGameRecord = {
                ...record,
                recordKind: "game",
                id: createRandomId(),
            };

            writeImportedLocalRecord(importedGame);
            importedLocalRecordIds.push(importedGame.id);
        }

        for (const record of parsed.drafts) {
            const importedDraft: LocalDraftRecord = {
                ...record,
                id: createRandomId(),
                imageSourceId: remapImportedImageSourceId(
                    record.imageSourceId,
                    imageSourceIdMap
                ),
            };

            writeImportedLocalRecord(importedDraft);
            importedLocalRecordIds.push(importedDraft.id);
        }

        return {
            gamesImported: parsed.games.length,
            draftsImported: parsed.drafts.length,
            imageSourcesImported: parsed.imageSources.length,
            missingImageSourceIds: parsed.missingImageSourceIds ?? [],
        };
    } catch (error) {
        for (const id of importedLocalRecordIds) {
            deleteLocalRecord(id);
        }

        for (const id of importedImageSourceIds) {
            await deleteImageSource(id);
        }

        throw error;
    }
}

export async function importLocalDataFromFile(file: File) {
    return importLocalDataFromText(await file.text());
}
