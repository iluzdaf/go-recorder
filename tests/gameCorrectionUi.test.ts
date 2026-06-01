import { describe, expect, it } from "vitest";

import type { GameState } from "../components/types";
import {
    applyRecorderCorrection,
    didPointerLeaveHoldVertex,
    getCorrectionTapAction,
    getEditableMoveIndexAtVertex,
    getPreviewStone,
    getSelectedMoveVertex,
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
    it("returns the selected play move vertex", () => {
        expect(
            getSelectedMoveVertex({
                gameState,
                selectedMoveIndex: 2,
            })
        ).toEqual({ x: 4, y: 4 });
    });

    it("does not return a selected vertex for pass, missing, or unselected moves", () => {
        expect(
            getSelectedMoveVertex({
                gameState,
                selectedMoveIndex: 1,
            })
        ).toBeNull();
        expect(
            getSelectedMoveVertex({
                gameState,
                selectedMoveIndex: 99,
            })
        ).toBeNull();
        expect(
            getSelectedMoveVertex({
                gameState,
                selectedMoveIndex: null,
            })
        ).toBeNull();
    });

    it("uses current player for placement previews and selected move color for correction previews", () => {
        expect(
            getPreviewStone({
                currentPlayer: "W",
                gameState,
                selectedMoveIndex: null,
            })
        ).toBe("W");
        expect(
            getPreviewStone({
                currentPlayer: "W",
                gameState,
                selectedMoveIndex: 0,
            })
        ).toBe("B");
        expect(
            getPreviewStone({
                currentPlayer: "B",
                gameState,
                selectedMoveIndex: 1,
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
                selectedMoveIndex: null,
            })
        ).toBe("play");
        expect(
            getCorrectionTapAction({
                editableMoveIndexAtVertex: 2,
                selectedMoveIndex: 2,
            })
        ).toBe("deselect");
        expect(
            getCorrectionTapAction({
                editableMoveIndexAtVertex: null,
                selectedMoveIndex: 2,
            })
        ).toBe("correct");
        expect(
            getCorrectionTapAction({
                editableMoveIndexAtVertex: 0,
                selectedMoveIndex: 2,
            })
        ).toBe("correct");
    });

    it("starts a stone selection hold only when no stone is selected", () => {
        expect(
            shouldStartStoneSelectionHold({
                editableMoveIndexAtVertex: 2,
                selectedMoveIndex: null,
            })
        ).toBe(true);
        expect(
            shouldStartStoneSelectionHold({
                editableMoveIndexAtVertex: null,
                selectedMoveIndex: null,
            })
        ).toBe(false);
        expect(
            shouldStartStoneSelectionHold({
                editableMoveIndexAtVertex: 2,
                selectedMoveIndex: 2,
            })
        ).toBe(false);
        expect(
            shouldStartStoneSelectionHold({
                editableMoveIndexAtVertex: 0,
                selectedMoveIndex: 2,
            })
        ).toBe(false);
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
            selectedMoveIndex: 0,
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
            selectedMoveIndex: null,
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

    it("rejects a recorder correction that would make replay illegal", () => {
        expect(
            applyRecorderCorrection({
                boardSize: 19,
                gameState,
                selectedMoveIndex: 0,
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
                selectedMoveIndex: null,
                vertex: { x: 5, y: 5 },
            })
        ).toEqual({
            ok: false,
            error: "No stone is selected",
        });
    });
});
