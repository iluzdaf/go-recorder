import type { Move, SetupStone } from "../components/types";

export type ExportSgfInput = {
    boardSize: number;
    moves: Move[];
    setupStones?: SetupStone[];
    handicap?: number;
    komi?: number | null;
    blackPlayerName?: string | null;
    whitePlayerName?: string | null;
};

type DownloadLink = Pick<HTMLAnchorElement, "click" | "download" | "href">;

type DownloadSgfEnvironment = {
    createLink: () => DownloadLink;
    createObjectURL: (blob: Blob) => string;
    revokeObjectURL: (url: string) => void;
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

function padDatePart(value: number) {
    return String(value).padStart(2, "0");
}

function formatTimestampForFilename(date: Date) {
    const dateText = [
        date.getFullYear(),
        padDatePart(date.getMonth() + 1),
        padDatePart(date.getDate()),
    ].join("-");
    const timeText = `${padDatePart(date.getHours())}-${padDatePart(date.getMinutes())}`;

    return `${dateText} ${timeText}`;
}

export function createSgfFilename(
    blackPlayerName?: string | null,
    whitePlayerName?: string | null,
    now = new Date()
) {
    const timestamp = formatTimestampForFilename(now);
    const blackName = blackPlayerName
        ? sanitizeFilenamePart(blackPlayerName)
        : null;

    const whiteName = whitePlayerName
        ? sanitizeFilenamePart(whitePlayerName)
        : null;

    if (blackName && whiteName) {
        return `${timestamp} ${blackName} (B) ${whiteName} (W).sgf`;
    }

    if (blackName) {
        return `${timestamp} ${blackName} (B).sgf`;
    }

    if (whiteName) {
        return `${timestamp} ${whiteName} (W).sgf`;
    }

    return `${timestamp}.sgf`;
}

export function exportSgf({
    boardSize,
    moves,
    setupStones = [],
    handicap = 0,
    komi,
    blackPlayerName,
    whitePlayerName,
}: ExportSgfInput) {
    const handicapText = handicap > 0 ? formatProperty("HA", handicap) : "";
    const komiText = komi != null && isFinite(komi) ? formatProperty("KM", komi) : "";
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

    return `(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[${boardSize}]${formatProperty("PB", blackPlayerName)}${formatProperty("PW", whitePlayerName)}${handicapText}${komiText}${setupStoneText}${moveText})`;
}

export function downloadSgf(
    input: ExportSgfInput,
    environment?: DownloadSgfEnvironment
) {
    const sgf = exportSgf(input);
    const blob = new Blob([sgf], {
        type: "application/x-go-sgf;charset=utf-8",
    });
    const helpers = environment ?? {
        createLink: () => document.createElement("a"),
        createObjectURL: (nextBlob: Blob) => URL.createObjectURL(nextBlob),
        revokeObjectURL: (url: string) => URL.revokeObjectURL(url),
    };
    const url = helpers.createObjectURL(blob);
    const link = helpers.createLink();

    link.href = url;
    link.download = createSgfFilename(
        input.blackPlayerName,
        input.whitePlayerName
    );
    link.click();

    helpers.revokeObjectURL(url);
}
