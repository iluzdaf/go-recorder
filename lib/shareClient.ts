import type {
    CreateShareInput,
    CreateShareResponse,
    LocalGameRecord,
    ShareSourceKind,
} from "../components/types";
import { t } from "./i18n";

type CreateShareFromLocalGameInput = {
    localGame: LocalGameRecord;
    sourceKind?: ShareSourceKind;
};

export function toCreateShareInput({
    localGame,
    sourceKind = "game",
}: CreateShareFromLocalGameInput): CreateShareInput {
    return {
        sourceKind,
        boardSize: localGame.boardSize,
        gameState: localGame.gameState,
        blackPlayerName: localGame.blackPlayerName,
        whitePlayerName: localGame.whitePlayerName,
        handicap: localGame.handicap,
    };
}

export async function createShareFromLocalGame({
    localGame,
    sourceKind = "game",
}: CreateShareFromLocalGameInput): Promise<CreateShareResponse> {
    const response = await fetch("/api/shares", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(toCreateShareInput({ localGame, sourceKind })),
    });

    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;

        throw new Error(body?.error ?? t("failedToCreateShare"));
    }

    return (await response.json()) as CreateShareResponse;
}
