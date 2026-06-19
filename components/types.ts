export type Stone = "B" | "W";

export type Move =
    | {
        type: "play";
        x: number;
        y: number;
        color: Stone;
    }
    | {
        type: "pass";
        color: Stone;
    };

export type SetupStone = {
    x: number;
    y: number;
    color: Stone;
};

export type GameState = {
    setupStones: SetupStone[];
    moves: Move[];
    currentPlayer: Stone;
};

export type FinalPosition = number[][];

export type BoardSize = 9 | 13 | 19;

export type ShareSourceKind = "game" | "draft";

export type LocalRecordKind = "game" | "draft";

export type DraftKind = "board" | "variation";

export type PositionViewAnchor =
    | "full"
    | "top-left"
    | "top"
    | "top-right"
    | "left"
    | "center"
    | "right"
    | "bottom-left"
    | "bottom"
    | "bottom-right";

export type PositionView = {
    anchor: PositionViewAnchor;
    rows: number;
    columns: number;
};

export type GameRecord = {
    slug: string;
    boardSize: BoardSize;
    gameState: GameState;
    blackPlayerName: string | null;
    whitePlayerName: string | null;
    handicap: number;
    createdAt: string;
    updatedAt: string;
};

export type LocalGameRecord = {
    recordKind?: "game";
    id: string;
    boardSize: BoardSize;
    gameState: GameState;
    blackPlayerName: string | null;
    whitePlayerName: string | null;
    handicap: number;
    createdAt: string;
    updatedAt: string;
    lastShareSlug?: string | null;
};

export type ImageSourceCorner = {
    x: number;
    y: number;
};

export type ImageSourceMetadata = {
    id: string;
    dataUrl: string;
    naturalWidth: number;
    naturalHeight: number;
    corners: [
        ImageSourceCorner,
        ImageSourceCorner,
        ImageSourceCorner,
        ImageSourceCorner,
    ];
};

export type LocalDraftRecord = {
    recordKind: "draft";
    draftKind: DraftKind;
    id: string;
    boardSize: BoardSize;
    gameState: GameState;
    blackPlayerName: string | null;
    whitePlayerName: string | null;
    handicap: number;
    createdAt: string;
    updatedAt: string;
    lastShareSlug: string | null;
    parentShareSlug: string | null;
    baseMoveCount: number | null;
    positionView?: PositionView | null;
    imageSourceId?: string | null;
};

export type LocalEditableRecord = LocalGameRecord | LocalDraftRecord;

export type ShareRecord = {
    slug: string;
    sourceKind: ShareSourceKind;
    draftKind?: DraftKind | null;
    boardSize: BoardSize;
    gameState: GameState;
    finalPosition?: FinalPosition | null;
    blackPlayerName: string | null;
    whitePlayerName: string | null;
    handicap: number;
    parentShareSlug?: string | null;
    baseMoveCount?: number | null;
    positionView?: PositionView | null;
    createdAt: string;
};

export type CreateShareInput = {
    sourceKind: ShareSourceKind;
    draftKind?: DraftKind | null;
    boardSize: BoardSize;
    gameState: GameState;
    blackPlayerName: string | null;
    whitePlayerName: string | null;
    handicap: number;
    parentShareSlug?: string | null;
    baseMoveCount?: number | null;
    positionView?: PositionView | null;
};

export type CreateShareResponse = {
    slug: string;
};
