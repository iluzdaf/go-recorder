import type {
    CreateShareInput,
    CreateShareResponse,
    LocalEditableRecord,
    LocalGameRecord,
    ShareSourceKind,
} from "../components/types";
import { t } from "./i18n";

type CreateShareFromLocalRecordInput = {
    localRecord: LocalEditableRecord;
    sourceKind?: ShareSourceKind;
};

type CreateShareFromLocalGameInput = {
    localGame: LocalGameRecord;
    sourceKind?: ShareSourceKind;
};

type ToCreateShareInputOptions =
    | CreateShareFromLocalRecordInput
    | CreateShareFromLocalGameInput;

function getLocalRecordFromShareInputOptions(
    options: ToCreateShareInputOptions
) {
    return "localRecord" in options ? options.localRecord : options.localGame;
}

export function toCreateShareInput(
    options: ToCreateShareInputOptions
): CreateShareInput {
    const localRecord = getLocalRecordFromShareInputOptions(options);
    const sourceKind = options.sourceKind ?? "game";

    return {
        sourceKind,
        boardSize: localRecord.boardSize,
        gameState: localRecord.gameState,
        blackPlayerName: localRecord.blackPlayerName,
        whitePlayerName: localRecord.whitePlayerName,
        handicap: localRecord.handicap,
    };
}

export async function createShareFromLocalRecord({
    localRecord,
    sourceKind = "game",
}: CreateShareFromLocalRecordInput): Promise<CreateShareResponse> {
    const response = await fetch("/api/shares", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(toCreateShareInput({ localRecord, sourceKind })),
    });

    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;

        throw new Error(body?.error ?? t("failedToCreateShare"));
    }

    return (await response.json()) as CreateShareResponse;
}

export function toCreateShareInputFromLocalGame({
    localGame,
    sourceKind = "game",
}: CreateShareFromLocalGameInput): CreateShareInput {
    return toCreateShareInput({
        localRecord: localGame,
        sourceKind,
    });
}

export async function createShareFromLocalGame({
    localGame,
    sourceKind = "game",
}: CreateShareFromLocalGameInput): Promise<CreateShareResponse> {
    return createShareFromLocalRecord({
        localRecord: localGame,
        sourceKind,
    });
}
