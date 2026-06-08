export function createAbsoluteShareUrl({
    origin,
    sharePath,
}: {
    origin: string;
    sharePath: string;
}) {
    return `${origin}${sharePath}`;
}

export function shouldGenerateShareQrCode({
    isOpen,
    sharePath,
    shouldGenerateQrCode,
}: {
    isOpen: boolean;
    sharePath: string | null;
    shouldGenerateQrCode: boolean;
}) {
    return isOpen && shouldGenerateQrCode && sharePath !== null;
}

export function shouldAutoCreateShare({
    canAutoCreate,
    hasAttempted,
    isOpen,
    mode,
    sharePath,
}: {
    canAutoCreate: boolean;
    hasAttempted: boolean;
    isOpen: boolean;
    mode: "chooser" | "created";
    sharePath: string | null;
}) {
    return (
        isOpen &&
        mode === "chooser" &&
        sharePath === null &&
        canAutoCreate &&
        !hasAttempted
    );
}
