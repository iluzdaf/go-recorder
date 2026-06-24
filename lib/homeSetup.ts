import type { BoardSize } from "../components/types";
import { isValidBoardSize } from "./gameLogic";

const HOME_SETUP_STORAGE_KEY = "go-recorder:home-setup";

export type HomeSetup = {
    boardSize: BoardSize;
    blackPlayerName: string;
    whitePlayerName: string;
    handicap: number;
    draftSource: "blank" | "image";
};

const DEFAULTS: HomeSetup = {
    boardSize: 19,
    blackPlayerName: "",
    whitePlayerName: "",
    handicap: 0,
    draftSource: "blank",
};

function isValidHandicap(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 9;
}

function isValidDraftSource(value: unknown): value is "blank" | "image" {
    return value === "blank" || value === "image";
}

export function loadHomeSetup(): HomeSetup {
    if (typeof window === "undefined") return DEFAULTS;

    try {
        const raw = window.localStorage.getItem(HOME_SETUP_STORAGE_KEY);
        if (!raw) return DEFAULTS;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) return DEFAULTS;

        const obj = parsed as Record<string, unknown>;
        return {
            boardSize: isValidBoardSize(obj.boardSize) ? (obj.boardSize as BoardSize) : DEFAULTS.boardSize,
            blackPlayerName: typeof obj.blackPlayerName === "string" ? obj.blackPlayerName : DEFAULTS.blackPlayerName,
            whitePlayerName: typeof obj.whitePlayerName === "string" ? obj.whitePlayerName : DEFAULTS.whitePlayerName,
            handicap: isValidHandicap(obj.handicap) ? obj.handicap : DEFAULTS.handicap,
            draftSource: isValidDraftSource(obj.draftSource) ? obj.draftSource : DEFAULTS.draftSource,
        };
    } catch {
        return DEFAULTS;
    }
}

export function saveHomeSetup(setup: HomeSetup): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HOME_SETUP_STORAGE_KEY, JSON.stringify(setup));
}
