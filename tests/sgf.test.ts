import { describe, expect, it } from "vitest";

import { exportSgf, toSgfCoord } from "../lib/sgf";

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
