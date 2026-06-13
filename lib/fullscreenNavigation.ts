type FullscreenDocument = Document & {
    webkitFullscreenElement?: Element | null;
    webkitCurrentFullScreenElement?: Element | null;
};

export function isDocumentFullscreenActive(documentValue: Document = document) {
    const fullscreenDocument = documentValue as FullscreenDocument;

    return Boolean(
        documentValue.fullscreenElement ||
            fullscreenDocument.webkitFullscreenElement ||
            fullscreenDocument.webkitCurrentFullScreenElement
    );
}

export function navigateWithinApp({
    path,
    push,
}: {
    path: string;
    push: (path: string) => void;
}) {
    if (isDocumentFullscreenActive()) {
        push(path);
        return;
    }

    window.location.assign(path);
}
