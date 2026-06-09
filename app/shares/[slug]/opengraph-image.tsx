import { ImageResponse } from "next/og";

import { getDisplayPlayerName } from "../../../lib/sharePresentation";
import { getFinalPositionFromGameState } from "../../../lib/shareFinalPosition";
import { getShareBoardPositionView } from "../../../lib/shareBoardView";
import { mapShareRowToShareRecord } from "../../../lib/shareView";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { createVariationMoveNumberMarkerMap } from "../../../lib/variationDraft";
import { getPositionViewRange } from "../../../lib/positionView";

export const runtime = "nodejs";

export const alt = "Shared Go game final position";
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = "image/png";

type ImageProps = {
    params: Promise<{
        slug: string;
    }>;
};

const SUCCESS_CACHE_CONTROL = "public, max-age=31536000, immutable";
const ERROR_CACHE_CONTROL = "no-store";
const PREVIEW_MARGIN = 20;
const SIDE_PANEL_GAP = 20;
const SIDE_PANEL_WIDTH = 240;

export function getBoardPreviewPadding(visibleDimension: number) {
    const visibleIntervals = Math.max(1, visibleDimension - 1);
    const scale = size.height / (visibleIntervals + 0.84);

    return Math.ceil(scale * 0.42);
}

export function getPreviewBoardPixelSize() {
    return size.height;
}

export function getPreviewBoardLayout({
    boardPadding,
    hasSidePanel,
    visibleColumns,
    visibleRows,
}: {
    boardPadding: number;
    hasSidePanel: boolean;
    visibleColumns: number;
    visibleRows: number;
}) {
    const availableWidth = hasSidePanel
        ? size.width - PREVIEW_MARGIN * 2 - SIDE_PANEL_GAP - SIDE_PANEL_WIDTH
        : size.width - PREVIEW_MARGIN * 2;
    const availableHeight = size.height;
    const gridColumns = Math.max(1, visibleColumns - 1);
    const gridRows = Math.max(1, visibleRows - 1);
    const gridStep = Math.min(
        (availableWidth - boardPadding * 2) / gridColumns,
        (availableHeight - boardPadding * 2) / gridRows
    );
    const boardWidth = gridColumns * gridStep + boardPadding * 2;
    const boardHeight = gridRows * gridStep + boardPadding * 2;

    return {
        boardHeight,
        boardLeft: hasSidePanel
            ? PREVIEW_MARGIN
            : (size.width - boardWidth) / 2,
        boardTop: (size.height - boardHeight) / 2,
        boardWidth,
        gridStep,
        sidePanelLeft: size.width - PREVIEW_MARGIN - SIDE_PANEL_WIDTH,
        sidePanelWidth: SIDE_PANEL_WIDTH,
    };
}

export function getVariationMarkerFontSize(stoneRadius: number) {
    return Math.max(24, Math.min(34, stoneRadius * 1.05));
}

function getStarPoints(boardSize: number) {
    if (boardSize === 19) {
        return [3, 9, 15].flatMap((x) => [3, 9, 15].map((y) => [x, y]));
    }

    if (boardSize === 13) {
        return [3, 6, 9].flatMap((x) => [3, 6, 9].map((y) => [x, y]));
    }

    return [2, 4, 6].flatMap((x) => [2, 4, 6].map((y) => [x, y]));
}

function renderFallbackImage(message: string) {
    return new ImageResponse(
        (
            <div
                style={{
                    alignItems: "center",
                    background: "#f4f4f5",
                    color: "#18181b",
                    display: "flex",
                    fontSize: 54,
                    fontWeight: 700,
                    height: "100%",
                    justifyContent: "center",
                    padding: 64,
                    textAlign: "center",
                    width: "100%",
                }}
            >
                {message}
            </div>
        ),
        {
            ...size,
            headers: {
                "Cache-Control": ERROR_CACHE_CONTROL,
            },
        }
    );
}

export default async function Image({ params }: ImageProps) {
    const { slug } = await params;

    const { data, error } = await supabaseAdmin
        .from("shares")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

    if (error) {
        return renderFallbackImage("Unable to render this game position.");
    }

    if (!data) {
        return new Response("Share not found", {
            headers: {
                "Cache-Control": ERROR_CACHE_CONTROL,
            },
            status: 404,
        });
    }

    const share = mapShareRowToShareRecord(data);
    const finalPositionResult = share.finalPosition
        ? {
              ok: true as const,
              finalPosition: share.finalPosition,
          }
        : getFinalPositionFromGameState({
              boardSize: share.boardSize,
              gameState: share.gameState,
          });

    if (!finalPositionResult.ok) {
        return renderFallbackImage("Unable to render this game position.");
    }

    const boardSize = share.boardSize;
    const positionRange = getPositionViewRange({
        boardSize,
        positionView: getShareBoardPositionView(share),
    });
    const visibleRows = positionRange?.rows ?? boardSize;
    const visibleColumns = positionRange?.columns ?? boardSize;
    const startX = positionRange?.startX ?? 0;
    const startY = positionRange?.startY ?? 0;
    const maxVisibleDimension = Math.max(visibleRows, visibleColumns);
    const boardPadding = getBoardPreviewPadding(maxVisibleDimension);
    const blackPlayerName = getDisplayPlayerName(share.blackPlayerName);
    const whitePlayerName = getDisplayPlayerName(share.whitePlayerName);
    const hasPlayerNames = blackPlayerName !== null || whitePlayerName !== null;
    const previewLayout = getPreviewBoardLayout({
        boardPadding,
        hasSidePanel: hasPlayerNames,
        visibleColumns,
        visibleRows,
    });
    const gridStep = previewLayout.gridStep;
    const visibleGridWidth = (visibleColumns - 1) * gridStep;
    const visibleGridHeight = (visibleRows - 1) * gridStep;
    const gridLeft = boardPadding;
    const gridTop = boardPadding;
    const stoneRadius = Math.max(10, gridStep * 0.42);
    const variationMarkerFontSize = getVariationMarkerFontSize(stoneRadius);
    const markerMap =
        share.draftKind === "variation" &&
        typeof share.baseMoveCount === "number"
            ? createVariationMoveNumberMarkerMap({
                  boardSize,
                  moves: share.gameState.moves,
                  signMap: finalPositionResult.finalPosition,
                  startMoveIndex: share.baseMoveCount,
              })
            : null;
    return new ImageResponse(
        (
            <div
                style={{
                    background: "#f4f4f5",
                    color: "#18181b",
                    display: "flex",
                    height: "100%",
                    position: "relative",
                    width: "100%",
                }}
            >
                <div
                    style={{
                        background: "#f4f4f5",
                        display: "flex",
                        height: previewLayout.boardHeight,
                        left: previewLayout.boardLeft,
                        position: "absolute",
                        top: previewLayout.boardTop,
                        width: previewLayout.boardWidth,
                    }}
                >
                    {Array.from({ length: visibleRows }, (_, rowIndex) => {
                        const offset = gridTop + rowIndex * gridStep;

                        return (
                            <div
                                key={`row-line-${rowIndex}`}
                                style={{ display: "flex" }}
                            >
                                <div
                                    style={{
                                        background: "#52525b",
                                        height: 2,
                                        left: gridLeft,
                                        position: "absolute",
                                        top: offset,
                                        width: visibleGridWidth,
                                    }}
                                />
                            </div>
                        );
                    })}
                    {Array.from({ length: visibleColumns }, (_, columnIndex) => {
                        const offset = gridLeft + columnIndex * gridStep;

                        return (
                            <div
                                key={`column-line-${columnIndex}`}
                                style={{ display: "flex" }}
                            >
                                <div
                                    style={{
                                        background: "#52525b",
                                        height: visibleGridHeight,
                                        left: offset,
                                        position: "absolute",
                                        top: gridTop,
                                        width: 2,
                                    }}
                                />
                            </div>
                        );
                    })}

                    {getStarPoints(boardSize).map(([x, y]) => {
                        if (
                            x < startX ||
                            x >= startX + visibleColumns ||
                            y < startY ||
                            y >= startY + visibleRows
                        ) {
                            return null;
                        }

                        return (
                            <div
                                key={`star-${x}-${y}`}
                                style={{
                                    background: "#3f3f46",
                                    borderRadius: "50%",
                                    height: 8,
                                    left: gridLeft + (x - startX) * gridStep - 4,
                                    position: "absolute",
                                    top: gridTop + (y - startY) * gridStep - 4,
                                    width: 8,
                                }}
                            />
                        );
                    })}

                    {finalPositionResult.finalPosition.flatMap((row, y) =>
                        row.map((sign, x) => {
                            if (sign === 0) return null;
                            if (
                                x < startX ||
                                x >= startX + visibleColumns ||
                                y < startY ||
                                y >= startY + visibleRows
                            ) {
                                return null;
                            }

                            const isBlack = sign === 1;
                            const left =
                                gridLeft + (x - startX) * gridStep - stoneRadius;
                            const top =
                                gridTop + (y - startY) * gridStep - stoneRadius;
                            const marker = markerMap?.[y]?.[x] ?? null;

                            return (
                                <div
                                    key={`stone-${x}-${y}`}
                                    style={{
                                        alignItems: "center",
                                        background: isBlack ? "#09090b" : "#fafafa",
                                        border: isBlack
                                            ? "1px solid #09090b"
                                            : "3px solid #18181b",
                                        borderRadius: "50%",
                                        color: isBlack ? "#fafafa" : "#18181b",
                                        display: "flex",
                                        fontSize: variationMarkerFontSize,
                                        fontWeight: 800,
                                        height: stoneRadius * 2,
                                        justifyContent: "center",
                                        letterSpacing: "0",
                                        left,
                                        lineHeight: 1,
                                        position: "absolute",
                                        top,
                                        width: stoneRadius * 2,
                                    }}
                                >
                                    {marker?.label ?? ""}
                                </div>
                            );
                        })
                    )}
                </div>

                {hasPlayerNames && (
                    <div
                        style={{
                            alignItems: "center",
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                            justifyContent: "center",
                            left: previewLayout.sidePanelLeft,
                            position: "absolute",
                            top: 0,
                            height: size.height,
                            width: previewLayout.sidePanelWidth,
                        }}
                    >
                        {blackPlayerName && (
                            <div
                                style={{
                                    alignItems: "center",
                                    display: "flex",
                                    gap: 14,
                                }}
                            >
                                <div
                                    style={{
                                        background: "#09090b",
                                        border: "1px solid #09090b",
                                        borderRadius: "50%",
                                        height: 30,
                                        width: 30,
                                    }}
                                />
                                <span
                                    style={{
                                        color: "#18181b",
                                        fontSize: 42,
                                        fontWeight: 800,
                                        letterSpacing: "0",
                                        lineHeight: 1,
                                    }}
                                >
                                    {blackPlayerName}
                                </span>
                            </div>
                        )}
                        {whitePlayerName && (
                            <div
                                style={{
                                    alignItems: "center",
                                    display: "flex",
                                    gap: 14,
                                }}
                            >
                                <div
                                    style={{
                                        background: "#fafafa",
                                        border: "3px solid #18181b",
                                        borderRadius: "50%",
                                        height: 30,
                                        width: 30,
                                    }}
                                />
                                <span
                                    style={{
                                        color: "#18181b",
                                        fontSize: 42,
                                        fontWeight: 800,
                                        letterSpacing: "0",
                                        lineHeight: 1,
                                    }}
                                >
                                    {whitePlayerName}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        ),
        {
            ...size,
            headers: {
                "Cache-Control": SUCCESS_CACHE_CONTROL,
            },
        }
    );
}
