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
