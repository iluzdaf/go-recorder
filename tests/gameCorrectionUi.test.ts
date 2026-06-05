import { describe, expect, it } from "vitest";

import type { GameState } from "../components/types";
import {
    applyRecorderCorrection,
    createStoneSelectionDragState,
    didPointerLeaveHoldVertex,
    getCorrectionPreviewStones,
    getCorrectionTapAction,
    getEditableMoveIndexAtVertex,
    getPreviewStone,
    getSelectedMoveVertices,
    getStoneCorrectionOrigin,
    getStoneSelectionDragVertexFromPointer,
    getVertexFromBoardPointer,
    isStoneSelectionDragActive,
    shouldShowStoneSelectionCloseButton,
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
        ).toBe("select");
        expect(
            getCorrectionTapAction({
                editableMoveIndexAtVertex: 0,
                selectedMoveIndexes: [2],
            })
        ).toBe("select");
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
        ).toBe(false);
        expect(
            shouldStartStoneSelectionHold({
                editableMoveIndexAtVertex: 0,
                selectedMoveIndexes: [2],
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

    it("keeps stone selection in highlight mode until dragging starts", () => {
        expect(
            isStoneSelectionDragActive({
                hasTouchPreview: true,
                selectedMoveIndexes: [0],
                didStartStoneSelectionDrag: false,
            })
        ).toBe(false);
        expect(
            isStoneSelectionDragActive({
                hasTouchPreview: true,
                selectedMoveIndexes: [0],
                didStartStoneSelectionDrag: true,
            })
        ).toBe(true);
        expect(
            isStoneSelectionDragActive({
                hasTouchPreview: false,
                selectedMoveIndexes: [0],
                didStartStoneSelectionDrag: true,
            })
        ).toBe(false);
        expect(
            isStoneSelectionDragActive({
                hasTouchPreview: true,
                selectedMoveIndexes: [],
                didStartStoneSelectionDrag: true,
            })
        ).toBe(false);
    });

    it("shows the close button after selection and hides it while dragging", () => {
        expect(
            shouldShowStoneSelectionCloseButton({
                hasSelectedStone: true,
                isDraggingSelectedStones: false,
            })
        ).toBe(true);
        expect(
            shouldShowStoneSelectionCloseButton({
                hasSelectedStone: true,
                isDraggingSelectedStones: true,
            })
        ).toBe(false);
        expect(
            shouldShowStoneSelectionCloseButton({
                hasSelectedStone: false,
                isDraggingSelectedStones: false,
            })
        ).toBe(false);
    });

    it("maps pointer positions to vertices from the board grid rect", () => {
        const grid = {
            left: 200,
            top: 100,
            cellSize: 40,
            boardSize: 19 as const,
        };

        expect(
            getVertexFromBoardPointer({
                clientX: 200 + 3 * 40 + 20,
                clientY: 100 + 4 * 40 + 20,
                grid,
            })
        ).toEqual({ x: 3, y: 4 });
        expect(
            getVertexFromBoardPointer({
                clientX: 199,
                clientY: 100 + 4 * 40 + 20,
                grid,
            })
        ).toBeNull();
    });

    it("preserves the pill-to-stone offset when converting drag pointer movement", () => {
        const grid = {
            left: 200,
            top: 100,
            cellSize: 40,
            boardSize: 19 as const,
        };
        const origin = { x: 3, y: 4 };
        const originCenter = {
            x: grid.left + origin.x * grid.cellSize + grid.cellSize / 2,
            y: grid.top + origin.y * grid.cellSize + grid.cellSize / 2,
        };
        const dragState = createStoneSelectionDragState({
            grid,
            origin,
            pointerId: 7,
            pointerX: originCenter.x - 28,
            pointerY: originCenter.y - 60,
        });

        expect(dragState).toEqual({
            pointerId: 7,
            origin,
            offsetX: -28,
            offsetY: -60,
        });
        expect(
            getStoneSelectionDragVertexFromPointer({
                clientX: originCenter.x - 28,
                clientY: originCenter.y - 60,
                dragState,
                grid,
            })
        ).toEqual(origin);
        expect(
            getStoneSelectionDragVertexFromPointer({
                clientX: originCenter.x - 28 + grid.cellSize,
                clientY: originCenter.y - 60 + grid.cellSize * 2,
                dragState,
                grid,
            })
        ).toEqual({ x: 4, y: 6 });
    });

    it("applies a stone correction and returns recorder UI state changes", () => {
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
            selectedMoveIndexes: [0],
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

    it("moves selected stones to a tapped position and keeps selected stones in formation", () => {
        const result = applyRecorderCorrection({
            boardSize: 19,
            gameState,
            selectedMoveIndexes: [0, 2],
            vertex: { x: 5, y: 5 },
        });

        expect(result).toEqual({
            ok: true,
            gameState: {
                ...gameState,
                moves: [
                    { type: "play", x: 5, y: 5, color: "B" },
                    gameState.moves[1],
                    { type: "play", x: 6, y: 6, color: "B" },
                ],
            },
            selectedMoveIndexes: [0, 2],
            status: null,
            hasUnsavedChanges: true,
        });
    });

    it("uses the first selection as the tap anchor for multi-stone corrections", () => {
        const result = applyRecorderCorrection({
            boardSize: 19,
            gameState,
            selectedMoveIndexes: [2, 0],
            vertex: { x: 5, y: 5 },
        });

        expect(result).toEqual({
            ok: true,
            gameState: {
                ...gameState,
                moves: [
                    { type: "play", x: 4, y: 4, color: "B" },
                    gameState.moves[1],
                    { type: "play", x: 5, y: 5, color: "B" },
                ],
            },
            selectedMoveIndexes: [2, 0],
            status: null,
            hasUnsavedChanges: true,
        });
    });

    it("applies dragged stone corrections relative to the dragged origin", () => {
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
            selectedMoveIndexes: [0, 2],
            status: null,
            hasUnsavedChanges: true,
        });
    });

    it("applies dragged stone corrections relative to an unselected origin", () => {
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
            selectedMoveIndexes: [0, 2],
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
            selectedMoveIndexes: [0],
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
            selectedMoveIndexes: [0, 2],
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
            selectedMoveIndexes: [0, 2],
            status: null,
            hasUnsavedChanges: true,
        });
    });

    it("previews all selected stones for a multi-stone tap correction from the first selected stone", () => {
        expect(
            getCorrectionPreviewStones({
                currentPlayer: "W",
                gameState,
                selectedMoveIndexes: [0, 2],
                vertex: { x: 5, y: 5 },
            })
        ).toEqual([
            { x: 5, y: 5, color: "B" },
            { x: 6, y: 6, color: "B" },
        ]);
    });

    it("previews all selected stones for a multi-stone drag correction", () => {
        expect(
            getCorrectionPreviewStones({
                currentPlayer: "W",
                from: { x: 1, y: 1 },
                gameState,
                selectedMoveIndexes: [0, 2],
                vertex: { x: 2, y: 3 },
            })
        ).toEqual([
            { x: 4, y: 5, color: "B" },
            { x: 5, y: 6, color: "B" },
        ]);
    });

    it("previews the current player for unselected move placement", () => {
        expect(
            getCorrectionPreviewStones({
                currentPlayer: "W",
                gameState,
                selectedMoveIndexes: [],
                vertex: { x: 5, y: 5 },
            })
        ).toEqual([{ x: 5, y: 5, color: "W" }]);
    });

    it("previews a single selected stone at the target even when a drag origin is present", () => {
        expect(
            getCorrectionPreviewStones({
                currentPlayer: "W",
                from: { x: 0, y: 0 },
                gameState,
                selectedMoveIndexes: [0],
                vertex: { x: 5, y: 5 },
            })
        ).toEqual([{ x: 5, y: 5, color: "B" }]);
    });

    it("previews multi-stone taps from the first selected stone and preserves colors", () => {
        const mixedColorGameState: GameState = {
            setupStones: [],
            moves: [
                { type: "play", x: 3, y: 3, color: "B" },
                { type: "play", x: 10, y: 10, color: "W" },
                { type: "play", x: 4, y: 4, color: "B" },
            ],
            currentPlayer: "W",
        };

        expect(
            getCorrectionPreviewStones({
                currentPlayer: "B",
                gameState: mixedColorGameState,
                selectedMoveIndexes: [0, 1],
                vertex: { x: 12, y: 11 },
            })
        ).toEqual([
            { x: 12, y: 11, color: "B" },
            { x: 19, y: 18, color: "W" },
        ]);
    });

    it("does not preview missing or non-play selected moves", () => {
        expect(
            getCorrectionPreviewStones({
                currentPlayer: "W",
                gameState,
                selectedMoveIndexes: [1, 99],
                vertex: { x: 5, y: 5 },
            })
        ).toEqual([]);
    });

    it("resolves stone correction origins from selection state", () => {
        expect(
            getStoneCorrectionOrigin({
                from: { x: 1, y: 1 },
                gameState,
                selectedMoveIndexes: [0],
            })
        ).toEqual({ x: 3, y: 3 });
        expect(
            getStoneCorrectionOrigin({
                from: { x: 1, y: 1 },
                gameState,
                selectedMoveIndexes: [0, 2],
            })
        ).toEqual({ x: 1, y: 1 });
        expect(
            getStoneCorrectionOrigin({
                gameState,
                selectedMoveIndexes: [2, 0],
            })
        ).toEqual({ x: 4, y: 4 });
    });

    it("rejects a stone correction that would make replay illegal", () => {
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

    it("rejects stone correction when no move is selected", () => {
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
