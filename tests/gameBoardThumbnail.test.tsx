import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GameBoardThumbnail } from "../components/GameListItem";

describe("GameBoardThumbnail", () => {
    it("renders stones and star points for a game", () => {
        const markup = renderToStaticMarkup(
            <GameBoardThumbnail
                game={{
                    boardSize: 19,
                    gameState: {
                        setupStones: [],
                        moves: [
                            { type: "play", x: 3, y: 3, color: "B" },
                            { type: "play", x: 15, y: 15, color: "W" },
                        ],
                        currentPlayer: "B",
                    },
                }}
            />
        );

        expect(markup).toContain("fill-zinc-900"); // black stone
        expect(markup).toContain("fill-white"); // white stone
        expect(markup).toContain("fill-zinc-500"); // grid lines / star points
    });

    it("renders variation move-number labels", () => {
        const markup = renderToStaticMarkup(
            <GameBoardThumbnail
                game={{
                    boardSize: 9,
                    draftKind: "variation",
                    baseMoveCount: 0,
                    gameState: {
                        setupStones: [],
                        moves: [
                            { type: "play", x: 0, y: 0, color: "B" },
                            { type: "play", x: 1, y: 1, color: "W" },
                        ],
                        currentPlayer: "B",
                    },
                }}
            />
        );

        expect(markup).toContain(">1</text>");
        expect(markup).toContain(">2</text>");
    });

    it("crops to the position view", () => {
        const markup = renderToStaticMarkup(
            <GameBoardThumbnail
                game={{
                    boardSize: 19,
                    positionView: { anchor: "top-left", rows: 4, columns: 4 },
                    gameState: {
                        setupStones: [
                            { x: 0, y: 0, color: "B" },
                            { x: 18, y: 18, color: "W" }, // outside the crop
                        ],
                        moves: [],
                        currentPlayer: "B",
                    },
                }}
            />
        );

        // The cropped 4x4 window shows the corner stone but not the far one.
        expect(markup).toContain("fill-zinc-900");
        expect(markup).not.toContain("fill-white");
    });
});
