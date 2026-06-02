import { describe, expect, it } from "vitest";

import { replayGame } from "../lib/gameReplay";

describe("replayGame", () => {
    it("replays setup stones and play moves", () => {
        const replay = replayGame({
            boardSize: 9,
            setupStones: [{ x: 2, y: 2, color: "B" }],
            moves: [
                { type: "play", x: 4, y: 4, color: "W" },
                { type: "play", x: 5, y: 4, color: "B" },
            ],
        });

        expect(replay.legal).toBe(true);
        expect(replay.error).toBeNull();
        expect(replay.board.signMap[2][2]).toBe(1);
        expect(replay.board.signMap[4][4]).toBe(-1);
        expect(replay.board.signMap[4][5]).toBe(1);
        expect(replay.visibleStoneOwners[2][2]).toEqual({
            type: "setup",
            setupIndex: 0,
        });
        expect(replay.visibleStoneOwners[4][4]).toEqual({
            type: "move",
            moveIndex: 0,
        });
        expect(replay.visibleStoneOwners[4][5]).toEqual({
            type: "move",
            moveIndex: 1,
        });
    });

    it("records pass moves without changing the board", () => {
        const replay = replayGame({
            boardSize: 9,
            setupStones: [],
            moves: [
                { type: "play", x: 4, y: 4, color: "B" },
                { type: "pass", color: "W" },
            ],
        });

        expect(replay.legal).toBe(true);
        expect(replay.moveRecords[1]).toMatchObject({
            moveIndex: 1,
            move: { type: "pass", color: "W" },
            capturedMoveIndexes: [],
            legal: true,
            error: null,
        });
        expect(replay.moveRecords[1].boardBefore).toBe(
            replay.moveRecords[1].boardAfter
        );
        expect(replay.visibleStoneOwners[4][4]).toEqual({
            type: "move",
            moveIndex: 0,
        });
    });

    it("records captured move indexes and removes captured ownership", () => {
        const replay = replayGame({
            boardSize: 9,
            setupStones: [],
            moves: [
                { type: "play", x: 1, y: 1, color: "W" },
                { type: "play", x: 0, y: 1, color: "B" },
                { type: "play", x: 8, y: 8, color: "W" },
                { type: "play", x: 1, y: 0, color: "B" },
                { type: "play", x: 8, y: 7, color: "W" },
                { type: "play", x: 2, y: 1, color: "B" },
                { type: "play", x: 7, y: 8, color: "W" },
                { type: "play", x: 1, y: 2, color: "B" },
            ],
        });

        expect(replay.legal).toBe(true);
        expect(replay.moveRecords[7].capturedMoveIndexes).toEqual([0]);
        expect(replay.board.signMap[1][1]).toBe(0);
        expect(replay.visibleStoneOwners[1][1]).toBeNull();
    });

    it("marks overwrites as illegal", () => {
        const replay = replayGame({
            boardSize: 9,
            setupStones: [],
            moves: [
                { type: "play", x: 4, y: 4, color: "B" },
                { type: "play", x: 4, y: 4, color: "W" },
            ],
        });

        expect(replay.legal).toBe(false);
        expect(replay.error).toBe("Overwrite prevented");
        expect(replay.moveRecords[1]).toMatchObject({
            moveIndex: 1,
            legal: false,
            error: "Overwrite prevented",
            capturedMoveIndexes: [],
        });
        expect(replay.visibleStoneOwners[4][4]).toEqual({
            type: "move",
            moveIndex: 0,
        });
    });

    it("marks suicide as illegal", () => {
        const replay = replayGame({
            boardSize: 9,
            setupStones: [],
            moves: [
                { type: "play", x: 0, y: 1, color: "B" },
                { type: "play", x: 8, y: 8, color: "W" },
                { type: "play", x: 1, y: 0, color: "B" },
                { type: "play", x: 0, y: 0, color: "W" },
            ],
        });

        expect(replay.legal).toBe(false);
        expect(replay.error).toBe("Suicide prevented");
        expect(replay.moveRecords[3]).toMatchObject({
            moveIndex: 3,
            legal: false,
            error: "Suicide prevented",
        });
        expect(replay.visibleStoneOwners[0][0]).toBeNull();
    });

    it("marks ko recapture as illegal", () => {
        const replay = replayGame({
            boardSize: 9,
            setupStones: [
                { x: 0, y: 1, color: "B" },
                { x: 1, y: 0, color: "B" },
                { x: 1, y: 2, color: "B" },
                { x: 2, y: 1, color: "B" },
                { x: 2, y: 0, color: "W" },
                { x: 2, y: 2, color: "W" },
                { x: 3, y: 1, color: "W" },
            ],
            moves: [
                { type: "play", x: 1, y: 1, color: "W" },
                { type: "play", x: 2, y: 1, color: "B" },
            ],
        });

        expect(replay.legal).toBe(false);
        expect(replay.error).toBe("Ko prevented");
        expect(replay.moveRecords.at(-1)).toMatchObject({
            moveIndex: 1,
            legal: false,
            error: "Ko prevented",
        });
    });
});
