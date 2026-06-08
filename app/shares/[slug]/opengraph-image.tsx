import { ImageResponse } from "next/og";

import {
    formatShareDate,
    getDisplayPlayerName,
} from "../../../lib/sharePresentation";
import { getFinalPositionFromGameState } from "../../../lib/shareFinalPosition";
import { getShareBoardPositionView } from "../../../lib/shareBoardView";
import { mapShareRowToShareRecord } from "../../../lib/shareView";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import {
    createVariationMoveNumberMarkerMap,
    getCapturedVariationMoveCaptionEntries,
} from "../../../lib/variationDraft";
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
const GO_COLUMN_LABELS = "ABCDEFGHJKLMNOPQRSTUVWXYZ";

export function getGoColumnLabel(x: number) {
    return GO_COLUMN_LABELS[x] ?? String(x + 1);
}

export function getGoRowLabel({
    boardSize,
    y,
}: {
    boardSize: number;
    y: number;
}) {
    return String(boardSize - y);
}

export function getCoordinateFontSize(stoneRadius: number) {
    return Math.max(16, Math.min(34, stoneRadius * 0.9));
}

export function getBoardCoordinatePadding(visibleDimension: number) {
    if (visibleDimension <= 9) return 76;
    if (visibleDimension <= 13) return 56;

    return 36;
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
    const boardPixelSize = 560;
    const positionRange = getPositionViewRange({
        boardSize,
        positionView: getShareBoardPositionView(share),
    });
    const visibleRows = positionRange?.rows ?? boardSize;
    const visibleColumns = positionRange?.columns ?? boardSize;
    const startX = positionRange?.startX ?? 0;
    const startY = positionRange?.startY ?? 0;
    const maxVisibleDimension = Math.max(visibleRows, visibleColumns);
    const boardPadding = getBoardCoordinatePadding(maxVisibleDimension);
    const gridSize = boardPixelSize - boardPadding * 2;
    const gridStep = gridSize / (maxVisibleDimension - 1);
    const visibleGridWidth = (visibleColumns - 1) * gridStep;
    const visibleGridHeight = (visibleRows - 1) * gridStep;
    const gridLeft = boardPadding + (gridSize - visibleGridWidth) / 2;
    const gridTop = boardPadding + (gridSize - visibleGridHeight) / 2;
    const stoneRadius = Math.max(10, gridStep * 0.42);
    const coordinateFontSize = getCoordinateFontSize(stoneRadius);
    const coordinateNudge = coordinateFontSize * 0.28;
    const blackPlayerName = getDisplayPlayerName(share.blackPlayerName);
    const whitePlayerName = getDisplayPlayerName(share.whitePlayerName);
    const hasPlayerNames = blackPlayerName !== null || whitePlayerName !== null;
    const boardLeft = hasPlayerNames ? 80 : (size.width - boardPixelSize) / 2;
    const boardTop = (size.height - boardPixelSize) / 2;
    const shareDate = formatShareDate(share.createdAt);
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
    const capturedVariationCaptionEntries =
        share.draftKind === "variation" &&
        typeof share.baseMoveCount === "number"
            ? getCapturedVariationMoveCaptionEntries({
                  baseMoveCount: share.baseMoveCount,
                  boardSize,
                  gameState: share.gameState,
              }).slice(0, 4)
            : [];

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
                        height: boardPixelSize,
                        left: boardLeft,
                        position: "absolute",
                        top: boardTop,
                        width: boardPixelSize,
                    }}
                >
                    {capturedVariationCaptionEntries.length > 0 && (
                        <div
                            style={{
                                alignItems: "center",
                                background: "rgba(250, 250, 250, 0.94)",
                                border: "2px solid #d4d4d8",
                                borderRadius: 14,
                                color: "#18181b",
                                display: "flex",
                                fontSize: 22,
                                fontWeight: 800,
                                gap: 12,
                                justifyContent: "center",
                                left: 44,
                                letterSpacing: "0",
                                lineHeight: 1,
                                padding: "9px 14px",
                                position: "absolute",
                                top: 0,
                                width: boardPixelSize - 88,
                                zIndex: 5,
                            }}
                        >
                            {capturedVariationCaptionEntries
                                .map((entry) => entry.label)
                                .join("  ")}
                        </div>
                    )}
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
                        const label = getGoColumnLabel(startX + columnIndex);

                        return (
                            <div
                                key={`column-line-${columnIndex}`}
                                style={{ display: "flex" }}
                            >
                                <div
                                    style={{
                                        color: "#3f3f46",
                                        display: "flex",
                                        fontSize: coordinateFontSize,
                                        fontWeight: 800,
                                        justifyContent: "center",
                                        left:
                                            offset -
                                            gridStep / 2 +
                                            coordinateNudge,
                                        letterSpacing: "0",
                                        lineHeight: 1,
                                        position: "absolute",
                                        top: 7,
                                        width: gridStep,
                                    }}
                                >
                                    {label}
                                </div>
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
                                <div
                                    style={{
                                        color: "#3f3f46",
                                        display: "flex",
                                        fontSize: coordinateFontSize,
                                        fontWeight: 800,
                                        justifyContent: "center",
                                        left:
                                            offset -
                                            gridStep / 2 +
                                            coordinateNudge,
                                        letterSpacing: "0",
                                        lineHeight: 1,
                                        position: "absolute",
                                        top: boardPixelSize - coordinateFontSize - 7,
                                        width: gridStep,
                                    }}
                                >
                                    {label}
                                </div>
                            </div>
                        );
                    })}

                    {Array.from({ length: visibleRows }, (_, rowIndex) => {
                        const offset = gridTop + rowIndex * gridStep;
                        const label = getGoRowLabel({
                            boardSize,
                            y: startY + rowIndex,
                        });

                        return (
                            <div
                                key={`row-label-${rowIndex}`}
                                style={{ display: "flex" }}
                            >
                                <div
                                    style={{
                                        alignItems: "center",
                                        color: "#3f3f46",
                                        display: "flex",
                                        fontSize: coordinateFontSize,
                                        fontWeight: 800,
                                        height: coordinateFontSize,
                                        justifyContent: "center",
                                        left: 6,
                                        letterSpacing: "0",
                                        lineHeight: 1,
                                        position: "absolute",
                                        top:
                                            offset -
                                            coordinateFontSize / 2 +
                                            coordinateNudge,
                                        width: 26,
                                    }}
                                >
                                    {label}
                                </div>
                                <div
                                    style={{
                                        alignItems: "center",
                                        color: "#3f3f46",
                                        display: "flex",
                                        fontSize: coordinateFontSize,
                                        fontWeight: 800,
                                        height: coordinateFontSize,
                                        justifyContent: "center",
                                        left: boardPixelSize - 32,
                                        letterSpacing: "0",
                                        lineHeight: 1,
                                        position: "absolute",
                                        top:
                                            offset -
                                            coordinateFontSize / 2 +
                                            coordinateNudge,
                                        width: 26,
                                    }}
                                >
                                    {label}
                                </div>
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
                                        fontSize: Math.max(18, stoneRadius * 0.82),
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
                            display: "flex",
                            flexDirection: "column",
                            gap: 18,
                            left: 700,
                            position: "absolute",
                            top: 132,
                            width: 360,
                        }}
                    >
                        {shareDate && (
                            <span
                                style={{
                                    color: "#52525b",
                                    fontSize: 28,
                                    fontWeight: 700,
                                    letterSpacing: "0",
                                    lineHeight: 1,
                                }}
                            >
                                {shareDate}
                            </span>
                        )}
                        {blackPlayerName && (
                            <div
                                style={{
                                    alignItems: "center",
                                    display: "flex",
                                    gap: 20,
                                }}
                            >
                                <div
                                    style={{
                                        background: "#09090b",
                                        border: "1px solid #09090b",
                                        borderRadius: "50%",
                                        height: 40,
                                        width: 40,
                                    }}
                                />
                                <span
                                    style={{
                                        color: "#18181b",
                                        fontSize: 62,
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
                                    gap: 20,
                                }}
                            >
                                <div
                                    style={{
                                        background: "#fafafa",
                                        border: "3px solid #18181b",
                                        borderRadius: "50%",
                                        height: 40,
                                        width: 40,
                                    }}
                                />
                                <span
                                    style={{
                                        color: "#18181b",
                                        fontSize: 62,
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
