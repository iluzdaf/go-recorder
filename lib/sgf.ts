import type { Move, SetupStone } from "../components/types";

type ExportSgfInput = {
    boardSize: number;
    moves: Move[];
    setupStones?: SetupStone[];
    handicap?: number;
    blackPlayerName?: string | null;
    whitePlayerName?: string | null;
};

export function toSgfCoord(x: number, y: number) {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    return `${letters[x]}${letters[y]}`;
}

function escapeSgfValue(value: string) {
    return value.replace(/\\/g, "\\\\").replace(/]/g, "\\]");
}

function formatProperty(identifier: string, value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return "";

    return `${identifier}[${escapeSgfValue(String(value))}]`;
}

function sanitizeFilenamePart(value: string) {
    return value
        .trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ");
}

function formatIsoTimestampForFilename(date: Date) {
    return date.toISOString().replace(/:/g, "-");
}

export function createSgfFilename(
    blackPlayerName?: string | null,
    whitePlayerName?: string | null,
    now = new Date()
) {
    const timestamp = formatIsoTimestampForFilename(now);
    const blackName = blackPlayerName
        ? sanitizeFilenamePart(blackPlayerName)
        : null;

    const whiteName = whitePlayerName
        ? sanitizeFilenamePart(whitePlayerName)
        : null;

    if (blackName && whiteName) {
        return `${timestamp} ${blackName} (b) vs ${whiteName} (w).sgf`;
    }

    return `${timestamp}.sgf`;
}

export function exportSgf({
    boardSize,
    moves,
    setupStones = [],
    handicap = 0,
    blackPlayerName,
    whitePlayerName,
}: ExportSgfInput) {
    const handicapText = handicap > 0 ? formatProperty("HA", handicap) : "";
    const setupStoneText =
        setupStones.length > 0
            ? `AB${setupStones.map((stone) => `[${toSgfCoord(stone.x, stone.y)}]`).join("")}`
            : "";

    const moveText = moves
        .map((move) => {
            if (move.type === "pass") {
                return `;${move.color}[]`;
            }

            return `;${move.color}[${toSgfCoord(move.x, move.y)}]`;
        })
        .join("");

    return `(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[${boardSize}]${formatProperty("PB", blackPlayerName)}${formatProperty("PW", whitePlayerName)}${handicapText}${setupStoneText}${moveText})`;
}
