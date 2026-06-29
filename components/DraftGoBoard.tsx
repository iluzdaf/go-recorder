"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Goban as ShudanGoban } from "@sabaki/shudan";
import type { ComponentType } from "react";

import type {
    GameState,
    ImageSourceMetadata,
    LocalDraftRecord,
    PositionView,
    SetupStone,
    Stone,
} from "./types";
import BoardStatusMessage from "./BoardStatusMessage";
import ConfirmDialog from "./ConfirmDialog";
import DraftBoardActionBar from "./DraftBoardActionBar";
import SgfSharePanel from "./SgfSharePanel";
import { downloadSgf } from "./sgf";
import {
    useBoardDisplaySettings,
    useHeaderStatus,
    useHeaderVisibility,
    useTheme,
} from "./AppShell";
import {
    applyBoardDraftStrokeVertex,
    clearDraftShareCache,
    getBoardDraftStrokeMode,
    getSetupStoneAtVertex,
    moveSetupStones,
} from "../lib/boardDraft";
import { getLivePositionViewGridMetrics } from "../lib/boardGeometry";
import { computeImageOverlayStyle } from "../lib/imageOverlayAlignment";
import { getImageSource } from "../lib/localImageStorage";
import { canShareDraft, getIllegalBoardGroupVertices } from "../lib/draftSharing";
import { formatMoveEditError, t } from "../lib/i18n";
import { saveLocalEditableRecord } from "../lib/localEditableSave";
import { getLocalRecord } from "../lib/localGames";
import {
    consumeSharePrivacyResumeContext,
    acknowledgeSharePrivacy,
    markSharePrivacyResumeContext,
    hasAcknowledgedSharePrivacy,
} from "../lib/sharePrivacy";
import {
    getDefaultPositionView,
    getPositionViewDisplaySize,
    getPositionViewRange,
    getVertexFromPositionViewPointer,
    type PositionViewGridGeometry,
} from "../lib/positionView";
import { createShareFromLocalRecord } from "../lib/shareClient";
import { replayGame } from "../lib/gameReplay";
import {
    applyRecorderCorrection,
    getEditableMoveIndexAtVertex,
    getPlacementZoomWindow,
    getSelectedMoveVertices,
    getStoneCorrectionOrigin,
    getVertexFromPlacementZoomPointer,
    isRecorderCorrectionLegal,
    shouldUsePlacementZoom,
} from "../lib/gameCorrectionUi";
import {
    createVariationMoveNumberMarkerMap,
    type MoveNumberMarker,
    playVariationDraftMove,
    undoVariationDraftMove,
} from "../lib/variationDraft";
import SharePrivacyDialog from "./SharePrivacyDialog";
import {
    useStoneCorrection,
    type StoneCorrectionAdapter,
    type StoneCorrectionGeometry,
    type StoneCorrectionStroke,
} from "./useStoneCorrection";
import useActionBarDrag from "./useActionBarDrag";
import useBoardGeometry from "./useBoardGeometry";
import useEditableShareMenuController from "./useEditableShareMenuController";

type DraftMarker = MoveNumberMarker | null | { type: "circle" };

type ShudanGobanProps = {
    vertexSize: number;
    signMap: number[][];
    markerMap: DraftMarker[][];
    showCoordinates: boolean;
    selectedVertices?: [number, number][];
    dimmedVertices?: [number, number][];
    rangeX?: [number, number];
    rangeY?: [number, number];
};

type DraftGoBoardProps = {
    id: string;
};

const BoardView = ShudanGoban as unknown as ComponentType<ShudanGobanProps>;

const EMPTY_GAME_STATE: GameState = {
    setupStones: [],
    moves: [],
    currentPlayer: "B",
};

function stoneToSign(stone: Stone) {
    return stone === "B" ? 1 : -1;
}

function cloneSignMap(signMap: number[][]) {
    return signMap.map((row) => [...row]);
}

function buildSignMap(boardSize: number, setupStones: SetupStone[]) {
    const signMap = Array.from({ length: boardSize }, () =>
        Array.from({ length: boardSize }, () => 0)
    );

    for (const setupStone of setupStones) {
        signMap[setupStone.y][setupStone.x] = stoneToSign(setupStone.color);
    }

    return signMap;
}

function loadLocalBoardDraft(id: string) {
    const record = getLocalRecord(id);

    if (!record || record.recordKind !== "draft") {
        return null;
    }

    return record;
}

export default function DraftGoBoard({ id }: DraftGoBoardProps) {
    const { isDarkMode } = useTheme();
    const { showBoardCoordinates, twoStepPlacement } = useBoardDisplaySettings();
    const { setHeaderStatus } = useHeaderStatus();
    const { isOverlayHeader } = useHeaderVisibility();
    const [draft, setDraft] = useState<LocalDraftRecord | null>(() =>
        loadLocalBoardDraft(id)
    );
    const draftRef = useRef<LocalDraftRecord | null>(draft);
    const hasPendingSaveRef = useRef(false);
    const hasExistingShareRef = useRef(Boolean(draft?.lastShareSlug));
    const [pendingEditFn, setPendingEditFn] = useState<(() => void) | null>(null);
    const [selectedColor, setSelectedColor] = useState<Stone>("B");
    const [imageSource, setImageSource] = useState<ImageSourceMetadata | null>(
        null
    );
    const [sourceImageVisible, setSourceImageVisible] = useState(false);
    const [shareStatus, setShareStatus] = useState<string | null>(null);
    const [isSharePrivacyDialogOpen, setIsSharePrivacyDialogOpen] = useState(
        () => consumeSharePrivacyResumeContext({ kind: "draft", id })
    );
    const shareMenu = useEditableShareMenuController({
        initialShareSlug: draft?.lastShareSlug ?? null,
    });
    const {
        canAutoCreateNow,
        clearShareLink,
        close: closeEditableShareMenu,
        finishCreated: finishEditableShareCreated,
        markAutoCreateAttempted,
        setCreating: setEditableShareCreating,
        setError: setEditableShareError,
        toggle: toggleEditableShareMenu,
    } = shareMenu;
    const actionBar = useActionBarDrag();
    const positionView = draft?.positionView ?? null;
    const displayBoardSize = draft
        ? getPositionViewDisplaySize({
              boardSize: draft.boardSize,
              positionView,
          })
        : 19;
    const { boardAreaRef, gobanWrapperRef, gridMetrics, vertexSize } =
        useBoardGeometry({
            boardSize: displayBoardSize,
            measureGrid: true,
            showCoordinates: showBoardCoordinates,
        });
    const dismissShareStatus = useCallback(() => setShareStatus(null), []);

    useEffect(() => {
        const imageSourceId = draft?.imageSourceId ?? null;
        if (!imageSourceId) return;
        let cancelled = false;
        void getImageSource(imageSourceId).then((result) => {
            if (!cancelled) setImageSource(result);
        });
        return () => {
            cancelled = true;
        };
    }, [draft?.imageSourceId]);

    useEffect(() => {
        setHeaderStatus(
            shareStatus ? (
                <BoardStatusMessage
                    message={shareStatus}
                    onDismiss={dismissShareStatus}
                />
            ) : null
        );

        return () => setHeaderStatus(null);
    }, [dismissShareStatus, setHeaderStatus, shareStatus]);

    const measureGeometry =
        useCallback((): PositionViewGridGeometry | null => {
            const gobanWrapper = gobanWrapperRef.current;
            const currentDraft = draftRef.current;
            if (!gobanWrapper || !currentDraft) return null;

            const positionRange = getPositionViewRange({
                boardSize: currentDraft.boardSize,
                positionView: currentDraft.positionView ?? null,
            });

            return positionRange
                ? getLivePositionViewGridMetrics({
                      columns: positionRange.columns,
                      gobanWrapper,
                      rows: positionRange.rows,
                      startX: positionRange.startX,
                      startY: positionRange.startY,
                  })
                : getLivePositionViewGridMetrics({
                      columns: currentDraft.boardSize,
                      gobanWrapper,
                      rows: currentDraft.boardSize,
                      startX: 0,
                      startY: 0,
                  });
        }, [gobanWrapperRef]);

    const clearCachedShareLink = useCallback(() => {
        clearShareLink();
    }, [clearShareLink]);

    const guardEdit = useCallback((fn: () => void) => {
        if (hasExistingShareRef.current) {
            setPendingEditFn(() => fn);
        } else {
            fn();
        }
    }, []);

    const updateDraft = useCallback((nextDraft: LocalDraftRecord) => {
        draftRef.current = nextDraft;
        hasPendingSaveRef.current = true;
        setDraft(nextDraft);
    }, []);

    useEffect(() => {
        if (!draft || !hasPendingSaveRef.current) return;

        const timeoutId = window.setTimeout(() => {
            const pendingDraft = draftRef.current;
            if (!pendingDraft) return;

            try {
                const savedRecord = saveLocalEditableRecord({
                    record: pendingDraft,
                });

                if (savedRecord.recordKind !== "draft") {
                    return;
                }

                draftRef.current = savedRecord;
                hasPendingSaveRef.current = false;
                setDraft(savedRecord);
            } catch (error) {
                console.error("Failed to save draft", error);
            }
        }, 500);

        return () => window.clearTimeout(timeoutId);
    }, [draft]);

    const handleToggleColor = useCallback(() => {
        setSelectedColor((currentColor) => (currentColor === "B" ? "W" : "B"));
    }, []);

    const handleToggleShareMenu = useCallback(() => {
        toggleEditableShareMenu();
    }, [toggleEditableShareMenu]);

    const handleChangePositionViewSettings = useCallback(
        (nextPositionView: PositionView) => {
            const currentDraft = draftRef.current;
            if (!currentDraft || currentDraft.draftKind !== "board") return;

            const currentPositionView =
                currentDraft.positionView ??
                getDefaultPositionView(currentDraft.boardSize);

            if (
                currentPositionView.anchor === nextPositionView.anchor &&
                currentPositionView.rows === nextPositionView.rows &&
                currentPositionView.columns === nextPositionView.columns
            ) {
                return;
            }

            guardEdit(() => {
                clearCachedShareLink();
                updateDraft(
                    clearDraftShareCache({
                        ...currentDraft,
                        positionView: nextPositionView,
                    })
                );
            });
        },
        [clearCachedShareLink, guardEdit, updateDraft]
    );

    const handleDownloadSgf = useCallback(() => {
        const currentDraft = draftRef.current;
        if (!currentDraft) return;

        downloadSgf({
            boardSize: currentDraft.boardSize,
            moves:
                currentDraft.draftKind === "variation"
                    ? currentDraft.gameState.moves
                    : [],
            setupStones: currentDraft.gameState.setupStones,
            handicap: currentDraft.handicap,
            blackPlayerName: currentDraft.blackPlayerName,
            whitePlayerName: currentDraft.whitePlayerName,
        });
    }, []);

    const handleDownloadSgfFromShareMenu = useCallback(() => {
        handleDownloadSgf();
        closeEditableShareMenu();
    }, [closeEditableShareMenu, handleDownloadSgf]);

    const handleSaveDraftSgfMetadata = useCallback((values: {
        blackPlayerName: string | null;
        whitePlayerName: string | null;
        komi: number;
    }) => {
        const currentDraft = draftRef.current;
        if (!currentDraft) return;

        guardEdit(() => {
            clearCachedShareLink();
            updateDraft(clearDraftShareCache({
                ...currentDraft,
                blackPlayerName: values.blackPlayerName,
                whitePlayerName: values.whitePlayerName,
                komi: values.komi,
            }));
        });
    }, [clearCachedShareLink, guardEdit, updateDraft]);

    const performShare = useCallback(async () => {
        const currentDraft = draftRef.current;

        if (!currentDraft) {
            setEditableShareError(t("gameNotLoaded"));
            return;
        }

        if (!canShareDraft(currentDraft)) {
            return;
        }

        if (currentDraft.draftKind === "board") {
            const illegal = getIllegalBoardGroupVertices(currentDraft);
            if (illegal.length > 0) {
                setEditableShareError(t("illegalGroupsOnBoard"));
                return;
            }
        }

        setEditableShareCreating(t("creatingShare"));

        try {
            const { slug } = await createShareFromLocalRecord({
                localRecord: currentDraft,
                sourceKind: "draft",
            });
            const savedRecord = saveLocalEditableRecord({
                record: {
                    ...currentDraft,
                    lastShareSlug: slug,
                },
            });

            if (savedRecord.recordKind !== "draft") {
                return;
            }

            draftRef.current = savedRecord;
            hasPendingSaveRef.current = false;
            setDraft(savedRecord);
            hasExistingShareRef.current = true;
            finishEditableShareCreated(slug);
        } catch (error) {
            setEditableShareError(
                error instanceof Error ? error.message : t("failedToCreateShare")
            );
        }
    }, [
        finishEditableShareCreated,
        setEditableShareCreating,
        setEditableShareError,
    ]);

    const handleShare = useCallback(async () => {
        if (!hasAcknowledgedSharePrivacy()) {
            setIsSharePrivacyDialogOpen(true);
            return;
        }

        await performShare();
    }, [performShare]);

    const handleConfirmSharePrivacy = useCallback(() => {
        acknowledgeSharePrivacy();
        setIsSharePrivacyDialogOpen(false);
        void performShare();
    }, [performShare]);

    const handleReadSharePrivacyPolicy = useCallback(() => {
        markSharePrivacyResumeContext({ kind: "draft", id });
    }, [id]);

    const handleCancelSharePrivacy = useCallback(() => {
        setIsSharePrivacyDialogOpen(false);
    }, []);

    useEffect(() => {
        if (!canAutoCreateNow) {
            return;
        }

        markAutoCreateAttempted();
        const timeoutId = window.setTimeout(() => {
            void handleShare();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [canAutoCreateNow, handleShare, markAutoCreateAttempted]);

    // --- Stone correction (shared machine for board + variation drafts) ---
    const isVariationDraft = draft?.draftKind === "variation";
    const correctionBoardSize = draft?.boardSize ?? 19;
    const correctionGameState = draft?.gameState ?? EMPTY_GAME_STATE;
    const variationReplay = isVariationDraft
        ? replayGame({
              boardSize: correctionBoardSize,
              setupStones: correctionGameState.setupStones,
              moves: correctionGameState.moves,
          })
        : null;
    const correctionSignMap =
        isVariationDraft && variationReplay
            ? variationReplay.board.signMap
            : buildSignMap(correctionBoardSize, correctionGameState.setupStones);
    const correctionMarkerMap: DraftMarker[][] = isVariationDraft
        ? createVariationMoveNumberMarkerMap({
              boardSize: correctionBoardSize,
              moves: correctionGameState.moves,
              signMap: correctionSignMap,
              startMoveIndex: draft?.baseMoveCount ?? 0,
          })
        : Array.from({ length: correctionBoardSize }, () =>
              Array.from<DraftMarker>({ length: correctionBoardSize }).fill(null)
          );
    const variationBaseMoveCount = draft?.baseMoveCount ?? 0;
    const positionRange = getPositionViewRange({
        boardSize: correctionBoardSize,
        positionView: draft?.positionView ?? null,
    });

    // The selection handle / touch guide are positioned in full-board vertex
    // coordinates, so shift gridMetrics by the visible range origin and use the
    // displayed cell size for position-view (partial-board) drafts.
    const correctionDisplayedCellSize = positionRange
        ? gridMetrics.boardSizePx / positionRange.columns
        : gridMetrics.cellSize;
    const correctionGridMetrics = positionRange
        ? {
              left:
                  gridMetrics.left -
                  positionRange.startX * correctionDisplayedCellSize,
              top:
                  gridMetrics.top -
                  positionRange.startY * correctionDisplayedCellSize,
              cellSize: correctionDisplayedCellSize,
              boardSizePx: gridMetrics.boardSizePx,
          }
        : gridMetrics;

    const correctionGeometry: StoneCorrectionGeometry<PositionViewGridGeometry> =
        {
            gridMetrics: correctionGridMetrics,
            measure: measureGeometry,
            getContainerHeight: () => boardAreaRef.current?.clientHeight ?? Infinity,
            vertexFromPointer: ({ clientX, clientY, geometry: grid }) =>
                getVertexFromPositionViewPointer({ clientX, clientY, grid }),
            createDragState: ({
                geometry: grid,
                origin,
                pointerId,
                pointerX,
                pointerY,
            }) => {
                const stoneCenterX =
                    grid.left +
                    (origin.x - grid.startX) * grid.cellSize +
                    grid.cellSize / 2;
                const stoneCenterY =
                    grid.top +
                    (origin.y - grid.startY) * grid.cellSize +
                    grid.cellSize / 2;
                return {
                    pointerId,
                    origin,
                    offsetX: pointerX - stoneCenterX,
                    offsetY: pointerY - stoneCenterY,
                };
            },
            dragVertexFromPointer: ({
                clientX,
                clientY,
                dragState,
                geometry: grid,
            }) =>
                getVertexFromPositionViewPointer({
                    clientX: clientX - dragState.offsetX,
                    clientY: clientY - dragState.offsetY,
                    grid,
                }),
            zoom: {
                enabled: isVariationDraft && twoStepPlacement,
                window: (vertex) => {
                    const grid = measureGeometry();
                    if (!grid) return null;
                    if (!shouldUsePlacementZoom({ cellSize: grid.cellSize })) {
                        return null;
                    }

                    return getPlacementZoomWindow({
                        boardSize: correctionBoardSize,
                        vertex,
                    });
                },
                vertexFromPointer: ({
                    clientX,
                    clientY,
                    geometry: grid,
                    zoomWindow,
                }) =>
                    getVertexFromPlacementZoomPointer({
                        clientX,
                        clientY,
                        grid: {
                            left: grid.left,
                            top: grid.top,
                            cellSize: grid.cellSize,
                            boardSize: correctionBoardSize,
                        },
                        zoomWindow,
                    }),
            },
        };

    const variationAdapter: StoneCorrectionAdapter = {
        getEditableItemIdAtVertex: (vertex) => {
            if (!isVariationDraft || !variationReplay) return null;

            const id = getEditableMoveIndexAtVertex({
                moves: correctionGameState.moves,
                vertex,
                visibleStoneOwners: variationReplay.visibleStoneOwners,
            });
            if (id === null) return null;

            // Lock the shared base game; only the variation's own moves edit.
            return id >= variationBaseMoveCount ? id : null;
        },
        getSelectedItemVertices: (ids) =>
            getSelectedMoveVertices({
                gameState: correctionGameState,
                selectedMoveIndexes: ids,
            }),
        getOrigin: (ids, from) =>
            getStoneCorrectionOrigin({
                from,
                gameState: correctionGameState,
                selectedMoveIndexes: ids,
            }),
        buildDragPreview: ({ ids, origin, target }) => {
            if (
                !isRecorderCorrectionLegal({
                    boardSize: correctionBoardSize,
                    from: origin,
                    gameState: correctionGameState,
                    selectedMoveIndexes: ids,
                    vertex: target,
                })
            ) {
                return null;
            }

            const previewSignMap = cloneSignMap(correctionSignMap);
            const previewVertices: [number, number][] = [];
            const dx = target.x - origin.x;
            const dy = target.y - origin.y;

            type PlayMoveWithNext = {
                move: { type: "play"; x: number; y: number; color: Stone };
                nextX: number;
                nextY: number;
            };
            const playMoves: PlayMoveWithNext[] = [];

            for (const moveIndex of ids) {
                const move = correctionGameState.moves[moveIndex];

                if (move?.type !== "play") continue;

                const nextX = move.x + dx;
                const nextY = move.y + dy;

                if (
                    nextX < 0 ||
                    nextX >= correctionBoardSize ||
                    nextY < 0 ||
                    nextY >= correctionBoardSize
                ) {
                    return null;
                }

                playMoves.push({ move, nextX, nextY });
            }

            for (const { move } of playMoves) {
                previewSignMap[move.y][move.x] = 0;
            }

            for (const { move, nextX, nextY } of playMoves) {
                previewSignMap[nextY][nextX] = stoneToSign(move.color);
                previewVertices.push([nextX, nextY]);
            }

            return {
                signMap: previewSignMap,
                selectedVertices: previewVertices,
            };
        },
        getDragHiddenMarkerVertex: () => null,
        applyMove: ({ ids, target, from }) => {
            const currentDraft = draftRef.current;
            if (!currentDraft || currentDraft.draftKind !== "variation") {
                return { ok: false as const, error: t("stoneCorrectionFailed") };
            }

            const result = applyRecorderCorrection({
                boardSize: currentDraft.boardSize,
                from,
                gameState: currentDraft.gameState,
                selectedMoveIndexes: ids,
                vertex: target,
            });

            if (!result.ok) {
                return {
                    ok: false as const,
                    error: formatMoveEditError(result.error),
                };
            }

            if (hasExistingShareRef.current) {
                setPendingEditFn(() => () => {
                    clearCachedShareLink();
                    updateDraft(
                        clearDraftShareCache({
                            ...currentDraft,
                            gameState: result.gameState,
                        })
                    );
                });
                return { ok: false as const, error: "" };
            }

            clearCachedShareLink();
            updateDraft(
                clearDraftShareCache({
                    ...currentDraft,
                    gameState: result.gameState,
                })
            );

            return {
                ok: true as const,
                selectedIds: result.selectedMoveIndexes,
                status: result.status,
            };
        },
        placeAt: (vertex) => {
            const currentDraft = draftRef.current;
            if (!currentDraft || currentDraft.draftKind !== "variation") return;

            const result = playVariationDraftMove({
                boardSize: currentDraft.boardSize,
                gameState: currentDraft.gameState,
                vertex,
            });

            if (result.ok) {
                guardEdit(() => {
                    clearCachedShareLink();
                    updateDraft(
                        clearDraftShareCache({
                            ...currentDraft,
                            gameState: result.gameState,
                        })
                    );
                });
            }
        },
    };

    const boardAdapter: StoneCorrectionAdapter = {
        getEditableItemIdAtVertex: (vertex) => {
            if (draftRef.current?.draftKind !== "board") return null;
            const index = getSetupStoneAtVertex(
                correctionGameState.setupStones,
                vertex
            );
            return index === -1 ? null : index;
        },
        getSelectedItemVertices: (ids) =>
            ids.flatMap((id) => {
                const stone = correctionGameState.setupStones[id];
                return stone ? [{ x: stone.x, y: stone.y }] : [];
            }),
        getOrigin: (ids, from) => {
            if (ids.length !== 1 && from) return from;
            const stone = correctionGameState.setupStones[ids[0]];
            return stone ? { x: stone.x, y: stone.y } : null;
        },
        buildDragPreview: ({ ids, origin, target }) => {
            const dx = target.x - origin.x;
            const dy = target.y - origin.y;
            const result = moveSetupStones({
                boardSize: correctionBoardSize,
                gameState: correctionGameState,
                indexes: ids,
                dx,
                dy,
            });
            if (!result.ok) return null;

            const previewSignMap = buildSignMap(
                correctionBoardSize,
                result.gameState.setupStones
            );
            const previewVertices = ids.flatMap((id) => {
                const stone = result.gameState.setupStones[id];
                return stone ? [[stone.x, stone.y] as [number, number]] : [];
            });

            return { signMap: previewSignMap, selectedVertices: previewVertices };
        },
        getDragHiddenMarkerVertex: () => null,
        applyMove: ({ ids, target, from }) => {
            const currentDraft = draftRef.current;
            if (!currentDraft || currentDraft.draftKind !== "board" || !from) {
                return { ok: false as const, error: t("stoneCorrectionFailed") };
            }

            const result = moveSetupStones({
                boardSize: currentDraft.boardSize,
                gameState: currentDraft.gameState,
                indexes: ids,
                dx: target.x - from.x,
                dy: target.y - from.y,
            });

            if (!result.ok) {
                return { ok: false as const, error: t("stoneCorrectionFailed") };
            }

            if (hasExistingShareRef.current) {
                setPendingEditFn(() => () => {
                    clearCachedShareLink();
                    updateDraft(
                        clearDraftShareCache({
                            ...currentDraft,
                            gameState: result.gameState,
                        })
                    );
                });
                return { ok: false as const, error: "" };
            }

            clearCachedShareLink();
            updateDraft(
                clearDraftShareCache({
                    ...currentDraft,
                    gameState: result.gameState,
                })
            );

            return { ok: true as const, selectedIds: ids, status: null };
        },
        // Board placement is handled by the stroke (tap on empty draws).
        placeAt: () => {},
    };

    const boardStroke: StoneCorrectionStroke = {
        getMode: (vertex) =>
            getBoardDraftStrokeMode({
                gameState: draftRef.current?.gameState ?? EMPTY_GAME_STATE,
                vertex,
            }),
        paint: (vertex, mode) => {
            const currentDraft = draftRef.current;
            if (!currentDraft || currentDraft.draftKind !== "board") return;

            const nextGameState = applyBoardDraftStrokeVertex({
                gameState: currentDraft.gameState,
                mode,
                selectedColor,
                vertex,
            });

            if (nextGameState === currentDraft.gameState) return;

            guardEdit(() => {
                clearCachedShareLink();
                updateDraft(
                    clearDraftShareCache({
                        ...currentDraft,
                        gameState: nextGameState,
                    })
                );
            });
        },
    };

    const correction = useStoneCorrection<DraftMarker, PositionViewGridGeometry>(
        {
            boardSize: correctionBoardSize,
            signMap: correctionSignMap,
            baseMarkerMap: correctionMarkerMap,
            vertexSize,
            showCoordinates: showBoardCoordinates,
            placementPreviewColor: isVariationDraft
                ? correctionGameState.currentPlayer
                : selectedColor,
            geometry: correctionGeometry,
            adapter: isVariationDraft ? variationAdapter : boardAdapter,
            onStatus: setShareStatus,
            stroke: isVariationDraft ? null : boardStroke,
        }
    );

    const handleConfirmEdit = () => {
        hasExistingShareRef.current = false;
        clearCachedShareLink();
        pendingEditFn?.();
        correction.clearSelection();
        setPendingEditFn(null);
    };

    const handleCancelEdit = () => {
        setPendingEditFn(null);
    };

    const handleToggleSourceImage = useCallback(() => {
        setSourceImageVisible((v) => !v);
    }, []);

    const handleVariationUndo = useCallback(() => {
        const currentDraft = draftRef.current;
        if (!currentDraft || currentDraft.draftKind !== "variation") return;
        if (currentDraft.baseMoveCount === null) return;

        const nextGameState = undoVariationDraftMove({
            baseMoveCount: currentDraft.baseMoveCount,
            gameState: currentDraft.gameState,
        });

        if (nextGameState === currentDraft.gameState) return;

        guardEdit(() => {
            correction.exitStoneEditMode();
            clearCachedShareLink();
            updateDraft(
                clearDraftShareCache({
                    ...currentDraft,
                    gameState: nextGameState,
                })
            );
        });
    }, [clearCachedShareLink, correction, guardEdit, updateDraft]);

    if (!draft) {
        return (
            <div className="flex h-full items-center justify-center bg-zinc-100 p-6 text-zinc-950 dark:bg-neutral-900 dark:text-white">
                {t("gameNotFound")}
            </div>
        );
    }

    const canUndoVariation =
        draft.draftKind === "variation" &&
        draft.baseMoveCount !== null &&
        draft.gameState.moves.length > draft.baseMoveCount;
    const canShareCurrentDraft = canShareDraft(draft);
    const illegalVertices =
        draft.draftKind === "board"
            ? getIllegalBoardGroupVertices(draft)
            : [];
    const renderSelectedVertices =
        draft.draftKind === "board"
            ? [...illegalVertices, ...correction.renderSelectedVertices]
            : correction.renderSelectedVertices;

    return (
        <div
            className={
                isDarkMode
                    ? "draft-board goban-theme-dark relative m-0 flex min-h-0 flex-1 touch-none flex-col overflow-hidden overscroll-none bg-neutral-900 p-0 text-white"
                    : "draft-board goban-theme-light relative m-0 flex min-h-0 flex-1 touch-none flex-col overflow-hidden overscroll-none bg-zinc-100 p-0 text-zinc-950"
            }
        >
                <div
                    ref={boardAreaRef}
                    className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden overscroll-none p-0"
                >
                    {isSharePrivacyDialogOpen ? (
                        <SharePrivacyDialog
                            returnToPath={`/drafts/${id}`}
                            onCancel={handleCancelSharePrivacy}
                            onReadPolicy={handleReadSharePrivacyPolicy}
                            onContinue={handleConfirmSharePrivacy}
                        />
                    ) : null}
                    {pendingEditFn ? (
                        <ConfirmDialog
                            titleId="edit-after-share-title"
                            message={t("editAfterShareWarning")}
                        confirmLabel={t("continueEditing")}
                        onCancel={handleCancelEdit}
                        onConfirm={handleConfirmEdit}
                    />
                ) : null}
                {shareMenu.isOpen ? (
                    <SgfSharePanel
                        alignToViewportTop={isOverlayHeader}
                        menuRef={shareMenu.menuRef}
                        blackPlayerName={draft.blackPlayerName}
                        boardSize={draft.draftKind === "board" ? draft.boardSize : undefined}
                        whitePlayerName={draft.whitePlayerName}
                        komi={draft.komi}
                        onChangePositionView={draft.draftKind === "board" ? handleChangePositionViewSettings : undefined}
                        positionView={draft.draftKind === "board" ? draft.positionView ?? null : undefined}
                        sgfReadOnly={draft.draftKind === "variation"}
                        onSaveSgfMetadata={draft.draftKind === "board" ? handleSaveDraftSgfMetadata : undefined}
                        canShareGame={canShareCurrentDraft}
                        isCreating={shareMenu.isCreating}
                        message={shareMenu.displayMessage}
                        mode={shareMenu.mode}
                        onCreateShare={handleShare}
                        onDownloadSgf={handleDownloadSgfFromShareMenu}
                        onCopyLink={shareMenu.copyShareLink}
                        qrCodeDataUrl={shareMenu.qrCodeDataUrl}
                        sharePath={shareMenu.sharePath}
                    />
                ) : null}
                <DraftBoardActionBar
                    anchor={actionBar.anchor}
                    dragX={actionBar.dragX}
                    canShareDraft={canShareCurrentDraft}
                    canUndo={canUndoVariation}
                    hasStoneCorrectionSelection={
                        correction.hasStoneCorrectionSelection
                    }
                    mode={draft.draftKind}
                    onClosePlacementZoom={correction.handleClosePlacementZoom}
                    onExitStoneEditMode={correction.exitStoneEditMode}
                    onLostPointerCapture={
                        actionBar.dragHandlers.onLostPointerCapture
                    }
                    onPointerCancel={actionBar.dragHandlers.onPointerCancel}
                    onPointerDown={actionBar.dragHandlers.onPointerDown}
                    onPointerMove={actionBar.dragHandlers.onPointerMove}
                    onPointerUp={actionBar.dragHandlers.onPointerUp}
                    onToggleColor={handleToggleColor}
                    onToggleShareMenu={handleToggleShareMenu}
                    onToggleSourceImage={handleToggleSourceImage}
                    onUndo={handleVariationUndo}
                    showSourceImageToggle={imageSource !== null}
                    sourceImageVisible={sourceImageVisible}
                    railRef={actionBar.railRef}
                    selectedColor={selectedColor}
                    shareMenuOpen={shareMenu.isOpen}
                    shareTriggerRef={shareMenu.triggerRef}
                    showPlacementZoomControl={Boolean(
                        correction.placementZoomWindow
                    )}
                />
                <div
                    ref={gobanWrapperRef}
                    className="relative"
                    onPointerCancel={correction.onBoardPointerCancel}
                    onPointerDown={correction.onBoardPointerDown}
                    onPointerMove={correction.onBoardPointerMove}
                    onPointerUp={correction.onBoardPointerUp}
                >
                    <BoardView
                        vertexSize={vertexSize}
                        signMap={correction.boardSignMap}
                        markerMap={correction.boardMarkerMap}
                        selectedVertices={renderSelectedVertices}
                        dimmedVertices={correction.renderDimmedVertices}
                        rangeX={positionRange?.rangeX}
                        rangeY={positionRange?.rangeY}
                        showCoordinates={showBoardCoordinates}
                    />
                    {sourceImageVisible && imageSource ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={imageSource.dataUrl}
                            alt=""
                            aria-hidden="true"
                            style={computeImageOverlayStyle({
                                imageSource,
                                boardSize: draft.boardSize,
                                gridMetrics,
                                positionViewRange: positionRange,
                            })}
                        />
                    ) : null}
                    {correction.placementZoomWindow ? (
                        <div
                            aria-hidden="true"
                            className={correction.placementZoomClassName}
                            style={{
                                left:
                                    gridMetrics.left +
                                    correction.placementZoomOffset,
                                top:
                                    gridMetrics.top +
                                    correction.placementZoomOffset,
                            }}
                        >
                            <BoardView
                                vertexSize={correction.placementZoomVertexSize}
                                signMap={correction.boardSignMap}
                                markerMap={correction.boardMarkerMap}
                                selectedVertices={renderSelectedVertices}
                                dimmedVertices={correction.renderDimmedVertices}
                                rangeX={correction.placementZoomRangeX}
                                rangeY={correction.placementZoomRangeY}
                                showCoordinates={showBoardCoordinates}
                            />
                        </div>
                    ) : null}
                    {correction.hasStoneCorrectionSelection ? (
                        <div
                            className={
                                isDarkMode
                                    ? "absolute z-30 inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-950 shadow-lg"
                                    : "absolute z-30 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white shadow-lg"
                            }
                            style={{
                                left:
                                    correction.stoneCorrectionHandlePosition
                                        ?.left ?? 0,
                                top:
                                    correction.stoneCorrectionHandlePosition
                                        ?.top ?? 0,
                                transform:
                                    correction.stoneCorrectionHandlePosition
                                        ?.transform,
                            }}
                        >
                            <button
                                data-testid="stone-correction-handle"
                                type="button"
                                className="inline-flex h-11 w-11 cursor-grab items-center justify-center active:cursor-grabbing"
                                onPointerDown={
                                    correction.startStoneSelectionHandleDrag
                                }
                                onPointerMove={
                                    correction.updateStoneSelectionHandleDrag
                                }
                                onPointerUp={
                                    correction.finishStoneSelectionHandleDrag
                                }
                                onPointerCancel={
                                    correction.cancelStoneSelectionHandleDrag
                                }
                                onLostPointerCapture={
                                    correction.cancelStoneSelectionHandleDrag
                                }
                                aria-label={t("moveSelectedStones")}
                                title={t("moveSelectedStones")}
                            >
                                <span
                                    aria-hidden="true"
                                    className="grid h-5 w-3.5 grid-cols-2 gap-x-1 gap-y-1 text-zinc-700 dark:text-zinc-200"
                                >
                                    <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                    <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                    <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                    <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                    <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                    <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-neutral-600" />
                                </span>
                            </button>
                        </div>
                    ) : null}
                    {correction.shouldShowTouchGuide &&
                        correction.touchGuideMetrics && (
                            <svg
                                className="pointer-events-none absolute z-20"
                                style={{
                                    left: correction.touchGuideMetrics.left,
                                    top: correction.touchGuideMetrics.top,
                                }}
                                width={correction.touchGuideMetrics.boardSizePx}
                                height={correction.touchGuideMetrics.boardSizePx}
                                viewBox={`0 0 ${correction.touchGuideMetrics.boardSizePx} ${correction.touchGuideMetrics.boardSizePx}`}
                            >
                                <line
                                    x1={0}
                                    y1={
                                        correction.touchGuideMetrics.y *
                                            correction.touchGuideMetrics
                                                .cellSize +
                                        correction.touchGuideMetrics.cellSize / 2
                                    }
                                    x2={correction.touchGuideMetrics.boardSizePx}
                                    y2={
                                        correction.touchGuideMetrics.y *
                                            correction.touchGuideMetrics
                                                .cellSize +
                                        correction.touchGuideMetrics.cellSize / 2
                                    }
                                    stroke="rgb(56 189 248 / 0.8)"
                                    strokeWidth="1"
                                    vectorEffect="non-scaling-stroke"
                                />
                                <line
                                    x1={
                                        correction.touchGuideMetrics.x *
                                            correction.touchGuideMetrics
                                                .cellSize +
                                        correction.touchGuideMetrics.cellSize / 2
                                    }
                                    y1={0}
                                    x2={
                                        correction.touchGuideMetrics.x *
                                            correction.touchGuideMetrics
                                                .cellSize +
                                        correction.touchGuideMetrics.cellSize / 2
                                    }
                                    y2={correction.touchGuideMetrics.boardSizePx}
                                    stroke="rgb(56 189 248 / 0.8)"
                                    strokeWidth="1"
                                    vectorEffect="non-scaling-stroke"
                                />
                            </svg>
                        )}
                </div>
            </div>
        </div>
    );
}
