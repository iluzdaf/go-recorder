import { describe, expect, it } from "vitest";

import type { GameState } from "../components/types";
import {
    applyRecorderCorrection,
    didPointerLeaveHoldVertex,
    getCorrectionTapAction,
    getEditableMoveIndexAtVertex,
    getPreviewStone,
    getSelectedMoveVertices,
    shouldApplyHoldDragCorrection,
    shouldStartStoneSelectionHold,
} from "../lib/gameCorrectionUi";

const gameState: GameState = {
    setupStones: [],
    moves: [
        { type: "play", x: 3, y: 3, color: "B" },
        { type: "pass", color: "W" },
        { type: "play", x: 4, y: 4, color: "B" },
    ],
    currentPlayer: "W",
};

describe("game correction UI helpers", () => {
    it("returns selected play move vertices", () => {
        expect(
            getSelectedMoveVertices({
                gameState,
                selectedMoveIndexes: [2],
            })
        ).toEqual([{ x: 4, y: 4 }]);
    });

    it("does not return selected vertices for pass, missing, or unselected moves", () => {
        expect(
            getSelectedMoveVertices({
                gameState,
                selectedMoveIndexes: [1],
            })
        ).toEqual([]);
        expect(
            getSelectedMoveVertices({
                gameState,
                selectedMoveIndexes: [99],
            })
        ).toEqual([]);
        expect(
            getSelectedMoveVertices({
                gameState,
                selectedMoveIndexes: [],
            })
        ).toEqual([]);
    });

    it("uses current player for placement previews and selected move color for correction previews", () => {
        expect(
            getPreviewStone({
                currentPlayer: "W",
                gameState,
                selectedMoveIndexes: [],
            })
        ).toBe("W");
        expect(
            getPreviewStone({
                currentPlayer: "W",
                gameState,
                selectedMoveIndexes: [0],
            })
        ).toBe("B");
        expect(
            getPreviewStone({
                currentPlayer: "B",
                gameState,
                selectedMoveIndexes: [1],
            })
        ).toBe("B");
    });

    it("returns editable visible move indexes", () => {
        const visibleStoneOwners = [
            [null, null],
            [null, { type: "move" as const, moveIndex: 2 }],
        ];

        expect(
            getEditableMoveIndexAtVertex({
                moves: gameState.moves,
                vertex: { x: 1, y: 1 },
                visibleStoneOwners,
            })
        ).toBe(2);
    });

    it("rejects setup, pass, missing, and empty vertices as editable moves", () => {
        const visibleStoneOwners = [
            [
                { type: "setup" as const, setupIndex: 0 },
                { type: "move" as const, moveIndex: 1 },
            ],
            [null, { type: "move" as const, moveIndex: 99 }],
        ];

        expect(
            getEditableMoveIndexAtVertex({
                moves: gameState.moves,
                vertex: { x: 0, y: 0 },
                visibleStoneOwners,
            })
        ).toBeNull();
        expect(
            getEditableMoveIndexAtVertex({
                moves: gameState.moves,
                vertex: { x: 1, y: 0 },
                visibleStoneOwners,
            })
        ).toBeNull();
        expect(
            getEditableMoveIndexAtVertex({
                moves: gameState.moves,
                vertex: { x: 1, y: 1 },
                visibleStoneOwners,
            })
        ).toBeNull();
        expect(
            getEditableMoveIndexAtVertex({
                moves: gameState.moves,
                vertex: { x: 0, y: 1 },
                visibleStoneOwners,
            })
        ).toBeNull();
    });

    it("chooses tap actions from selection state", () => {
        expect(
            getCorrectionTapAction({
                editableMoveIndexAtVertex: null,
                selectedMoveIndexes: [],
            })
        ).toBe("play");
        expect(
            getCorrectionTapAction({
                editableMoveIndexAtVertex: 2,
                selectedMoveIndexes: [2],
            })
        ).toBe("deselect");
        expect(
            getCorrectionTapAction({
                editableMoveIndexAtVertex: null,
                selectedMoveIndexes: [2],
            })
        ).toBe("correct");
        expect(
            getCorrectionTapAction({
                editableMoveIndexAtVertex: 0,
                selectedMoveIndexes: [2],
            })
        ).toBe("correct");
    });

    it("starts a stone selection hold for editable stones", () => {
        expect(
            shouldStartStoneSelectionHold({
                editableMoveIndexAtVertex: 2,
                selectedMoveIndexes: [],
            })
        ).toBe(true);
        expect(
            shouldStartStoneSelectionHold({
                editableMoveIndexAtVertex: null,
                selectedMoveIndexes: [],
            })
        ).toBe(false);
        expect(
            shouldStartStoneSelectionHold({
                editableMoveIndexAtVertex: 2,
                selectedMoveIndexes: [2],
            })
        ).toBe(true);
        expect(
            shouldStartStoneSelectionHold({
                editableMoveIndexAtVertex: 0,
                selectedMoveIndexes: [2],
            })
        ).toBe(true);
    });

    it("detects when a pointer leaves the held vertex", () => {
        expect(
            didPointerLeaveHoldVertex({
                origin: { x: 3, y: 3 },
                vertex: { x: 3, y: 3 },
            })
        ).toBe(false);
        expect(
            didPointerLeaveHoldVertex({
                origin: { x: 3, y: 3 },
                vertex: { x: 4, y: 3 },
            })
        ).toBe(true);
        expect(
            didPointerLeaveHoldVertex({
                origin: { x: 3, y: 3 },
                vertex: null,
            })
        ).toBe(true);
        expect(
            didPointerLeaveHoldVertex({
                origin: null,
                vertex: { x: 3, y: 3 },
            })
        ).toBe(false);
    });

    it("applies hold-drag correction only after moving away from the held vertex", () => {
        expect(
            shouldApplyHoldDragCorrection({
                origin: { x: 3, y: 3 },
                vertex: { x: 4, y: 3 },
            })
        ).toBe(true);
        expect(
            shouldApplyHoldDragCorrection({
                origin: { x: 3, y: 3 },
                vertex: { x: 3, y: 3 },
            })
        ).toBe(false);
        expect(
            shouldApplyHoldDragCorrection({
                origin: { x: 3, y: 3 },
                vertex: null,
            })
        ).toBe(false);
        expect(
            shouldApplyHoldDragCorrection({
                origin: null,
                vertex: { x: 4, y: 3 },
            })
        ).toBe(false);
    });

    it("applies a recorder correction and returns recorder UI state changes", () => {
        const result = applyRecorderCorrection({
            boardSize: 19,
            gameState,
            selectedMoveIndexes: [0],
            vertex: { x: 5, y: 5 },
        });

        expect(result).toEqual({
            ok: true,
            gameState: {
                ...gameState,
                moves: [
                    { type: "play", x: 5, y: 5, color: "B" },
                    gameState.moves[1],
                    gameState.moves[2],
                ],
            },
            selectedMoveIndexes: [],
            status: null,
            hasUnsavedChanges: true,
        });
        expect(gameState.moves[0]).toEqual({
            type: "play",
            x: 3,
            y: 3,
            color: "B",
        });
    });

    it("rejects multiple selected recorder corrections without a drag origin", () => {
        expect(
            applyRecorderCorrection({
                boardSize: 19,
                gameState,
                selectedMoveIndexes: [0, 2],
                vertex: { x: 5, y: 5 },
            })
        ).toEqual({
            ok: false,
            error: "Multiple stones need a drag origin",
        });
    });

    it("applies dragged recorder corrections relative to the dragged origin", () => {
        const result = applyRecorderCorrection({
            boardSize: 19,
            from: { x: 4, y: 4 },
            gameState,
            selectedMoveIndexes: [0, 2],
            vertex: { x: 5, y: 6 },
        });

        expect(result).toEqual({
            ok: true,
            gameState: {
                ...gameState,
                moves: [
                    { type: "play", x: 4, y: 5, color: "B" },
                    gameState.moves[1],
                    { type: "play", x: 5, y: 6, color: "B" },
                ],
            },
            selectedMoveIndexes: [],
            status: null,
            hasUnsavedChanges: true,
        });
    });

    it("applies dragged recorder corrections relative to an unselected origin", () => {
        const result = applyRecorderCorrection({
            boardSize: 19,
            from: { x: 1, y: 1 },
            gameState,
            selectedMoveIndexes: [0, 2],
            vertex: { x: 2, y: 3 },
        });

        expect(result).toEqual({
            ok: true,
            gameState: {
                ...gameState,
                moves: [
                    { type: "play", x: 4, y: 5, color: "B" },
                    gameState.moves[1],
                    { type: "play", x: 5, y: 6, color: "B" },
                ],
            },
            selectedMoveIndexes: [],
            status: null,
            hasUnsavedChanges: true,
        });
    });

    it("keeps single-stone corrections anchored to the destination even with a drag origin", () => {
        const result = applyRecorderCorrection({
            boardSize: 19,
            from: { x: 0, y: 0 },
            gameState,
            selectedMoveIndexes: [0],
            vertex: { x: 5, y: 5 },
        });

        expect(result).toEqual({
            ok: true,
            gameState: {
                ...gameState,
                moves: [
                    { type: "play", x: 5, y: 5, color: "B" },
                    gameState.moves[1],
                    gameState.moves[2],
                ],
            },
            selectedMoveIndexes: [],
            status: null,
            hasUnsavedChanges: true,
        });
    });

    it("moves the dragged selected stone to the target and keeps selected stones in formation", () => {
        const result = applyRecorderCorrection({
            boardSize: 19,
            from: { x: 4, y: 4 },
            gameState,
            selectedMoveIndexes: [0, 2],
            vertex: { x: 7, y: 5 },
        });

        expect(result).toEqual({
            ok: true,
            gameState: {
                ...gameState,
                moves: [
                    { type: "play", x: 6, y: 4, color: "B" },
                    gameState.moves[1],
                    { type: "play", x: 7, y: 5, color: "B" },
                ],
            },
            selectedMoveIndexes: [],
            status: null,
            hasUnsavedChanges: true,
        });
    });

    it("moves selected stones by negative drag deltas while preserving formation", () => {
        const result = applyRecorderCorrection({
            boardSize: 19,
            from: { x: 5, y: 5 },
            gameState,
            selectedMoveIndexes: [0, 2],
            vertex: { x: 4, y: 3 },
        });

        expect(result).toEqual({
            ok: true,
            gameState: {
                ...gameState,
                moves: [
                    { type: "play", x: 2, y: 1, color: "B" },
                    gameState.moves[1],
                    { type: "play", x: 3, y: 2, color: "B" },
                ],
            },
            selectedMoveIndexes: [],
            status: null,
            hasUnsavedChanges: true,
        });
    });

    it("rejects a recorder correction that would make replay illegal", () => {
        expect(
            applyRecorderCorrection({
                boardSize: 19,
                gameState,
                selectedMoveIndexes: [0],
                vertex: { x: 4, y: 4 },
            })
        ).toEqual({
            ok: false,
            error: "Overwrite prevented",
        });
    });

    it("rejects recorder correction when no move is selected", () => {
        expect(
            applyRecorderCorrection({
                boardSize: 19,
                gameState,
                selectedMoveIndexes: [],
                vertex: { x: 5, y: 5 },
            })
        ).toEqual({
            ok: false,
            error: "No stone is selected",
        });
    });
});
