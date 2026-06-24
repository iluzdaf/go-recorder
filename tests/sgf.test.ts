import { describe, expect, it, vi } from "vitest";

import {
    createSgfFilename,
    downloadSgf,
    exportSgf,
    toSgfCoord,
} from "../lib/sgf";

describe("toSgfCoord", () => {
    it("converts zero-based board coordinates to SGF coordinates", () => {
        expect(toSgfCoord(0, 0)).toBe("aa");
        expect(toSgfCoord(3, 3)).toBe("dd");
        expect(toSgfCoord(18, 18)).toBe("ss");
    });
});

describe("exportSgf", () => {
    it("exports an empty 19x19 game", () => {
        expect(exportSgf({ boardSize: 19, moves: [] })).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[19])"
        );
    });

    it("exports an empty 9x9 game", () => {
        expect(exportSgf({ boardSize: 9, moves: [] })).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[9])"
        );
    });

    it("exports play moves in order", () => {
        const sgf = exportSgf({
            boardSize: 19,
            moves: [
                {
                    type: "play",
                    x: 3,
                    y: 3,
                    color: "B",
                },
                {
                    type: "play",
                    x: 15,
                    y: 15,
                    color: "W",
                },
            ],
        });

        expect(sgf).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[19];B[dd];W[pp])"
        );
    });

    it("exports pass moves", () => {
        const sgf = exportSgf({
            boardSize: 19,
            moves: [
                {
                    type: "pass",
                    color: "B",
                },
                {
                    type: "pass",
                    color: "W",
                },
            ],
        });

        expect(sgf).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[19];B[];W[])"
        );
    });

    it("exports mixed play and pass moves", () => {
        const sgf = exportSgf({
            boardSize: 13,
            moves: [
                {
                    type: "play",
                    x: 6,
                    y: 6,
                    color: "B",
                },
                {
                    type: "pass",
                    color: "W",
                },
                {
                    type: "play",
                    x: 0,
                    y: 12,
                    color: "B",
                },
            ],
        });

        expect(sgf).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[13];B[gg];W[];B[am])"
        );
    });

    it("exports player names", () => {
        const sgf = exportSgf({
            boardSize: 19,
            moves: [],
            blackPlayerName: "Black Player",
            whitePlayerName: "White Player",
        });

        expect(sgf).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[19]PB[Black Player]PW[White Player])"
        );
    });

    it("escapes player names for SGF values", () => {
        const sgf = exportSgf({
            boardSize: 19,
            moves: [],
            blackPlayerName: "Black ] Player",
            whitePlayerName: "White \\ Player",
        });

        expect(sgf).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[19]PB[Black \\] Player]PW[White \\\\ Player])"
        );
    });

    it("exports handicap count and setup stones", () => {
        const sgf = exportSgf({
            boardSize: 19,
            moves: [],
            handicap: 2,
            setupStones: [
                { x: 3, y: 15, color: "B" },
                { x: 15, y: 3, color: "B" },
            ],
        });

        expect(sgf).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[19]HA[2]AB[dp][pd])"
        );
    });

    it("exports komi", () => {
        const sgf = exportSgf({
            boardSize: 19,
            moves: [],
            komi: 6.5,
        });

        expect(sgf).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[19]KM[6.5])"
        );
    });

    it("exports zero komi", () => {
        const sgf = exportSgf({
            boardSize: 19,
            moves: [],
            komi: 0,
        });

        expect(sgf).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[19]KM[0])"
        );
    });

    it("omits KM when komi is null", () => {
        const sgf = exportSgf({
            boardSize: 19,
            moves: [],
            komi: null,
        });

        expect(sgf).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[19])"
        );
    });

    it("omits KM when komi is undefined", () => {
        const sgf = exportSgf({
            boardSize: 19,
            moves: [],
        });

        expect(sgf).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[19])"
        );
    });

    it("exports handicap setup stones before normal moves", () => {
        const sgf = exportSgf({
            boardSize: 19,
            moves: [
                {
                    type: "play",
                    x: 9,
                    y: 9,
                    color: "W",
                },
            ],
            handicap: 2,
            setupStones: [
                { x: 3, y: 15, color: "B" },
                { x: 15, y: 3, color: "B" },
            ],
        });

        expect(sgf).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[19]HA[2]AB[dp][pd];W[jj])"
        );
    });
});

describe("createSgfFilename", () => {
    it("uses a readable timestamp and both player names", () => {
        const date = new Date(2026, 5, 3, 10, 24, 42);

        expect(
            createSgfFilename("Black Player", "White Player", date)
        ).toBe("2026-06-03 10-24 Black Player (B) White Player (W).sgf");
    });

    it("uses the black player name when only black is available", () => {
        const date = new Date(2026, 5, 3, 10, 24, 42);

        expect(createSgfFilename("Black Player", null, date)).toBe(
            "2026-06-03 10-24 Black Player (B).sgf"
        );
    });

    it("uses the white player name when only white is available", () => {
        const date = new Date(2026, 5, 3, 10, 24, 42);

        expect(createSgfFilename(null, "White Player", date)).toBe(
            "2026-06-03 10-24 White Player (W).sgf"
        );
    });

    it("uses only a readable timestamp when names are missing", () => {
        const date = new Date(2026, 5, 3, 10, 24, 42);

        expect(createSgfFilename(undefined, undefined, date)).toBe(
            "2026-06-03 10-24.sgf"
        );
    });

    it("sanitizes player names in filenames", () => {
        const date = new Date(2026, 5, 3, 10, 24, 42);

        expect(createSgfFilename("Black / Player", "White: Player", date)).toBe(
            "2026-06-03 10-24 Black Player (B) White Player (W).sgf"
        );
    });
});

describe("downloadSgf", () => {
    it("downloads exported SGF and revokes the temporary URL", async () => {
        const blobs: Blob[] = [];
        const click = vi.fn();
        const link = {
            click,
            download: "",
            href: "",
        };
        const createObjectURL = vi.fn((blob: Blob) => {
            blobs.push(blob);
            return "blob:sgf";
        });
        const revokeObjectURL = vi.fn();

        downloadSgf(
            {
                boardSize: 9,
                blackPlayerName: "Black Player",
                moves: [{ type: "play", color: "B", x: 2, y: 3 }],
                whitePlayerName: "White Player",
            },
            {
                createLink: () => link,
                createObjectURL,
                revokeObjectURL,
            }
        );

        expect(createObjectURL).toHaveBeenCalledOnce();
        expect(await blobs[0]?.text()).toBe(
            "(;GM[1]FF[4]CA[UTF-8]AP[go-recorder]SZ[9]PB[Black Player]PW[White Player];B[cd])"
        );
        expect(blobs[0]?.type).toBe("application/x-go-sgf;charset=utf-8");
        expect(link.href).toBe("blob:sgf");
        expect(link.download).toMatch(
            / Black Player \(B\) White Player \(W\)\.sgf$/
        );
        expect(click).toHaveBeenCalledOnce();
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:sgf");
    });
});
