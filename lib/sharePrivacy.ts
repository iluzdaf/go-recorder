const SHARE_PRIVACY_ACK_STORAGE_KEY =
    "go-recorder:share-privacy-acknowledged:v1";
const SHARE_PRIVACY_RESUME_STORAGE_KEY_PREFIX =
    "go-recorder:share-privacy-resume:v1:";

export type SharePrivacyResumeContext = {
    kind: "game" | "draft";
    id: string;
};

function getSharePrivacyResumeStorageKey({
    kind,
    id,
}: SharePrivacyResumeContext) {
    return `${SHARE_PRIVACY_RESUME_STORAGE_KEY_PREFIX}${kind}:${id}`;
}

export function hasAcknowledgedSharePrivacy() {
    if (typeof window === "undefined") {
        return true;
    }

    return window.localStorage.getItem(SHARE_PRIVACY_ACK_STORAGE_KEY) === "true";
}

export function acknowledgeSharePrivacy() {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(SHARE_PRIVACY_ACK_STORAGE_KEY, "true");
}

export function markSharePrivacyResumeContext(context: SharePrivacyResumeContext) {
    if (typeof window === "undefined") {
        return;
    }

    window.sessionStorage.setItem(
        getSharePrivacyResumeStorageKey(context),
        "true"
    );
}

export function consumeSharePrivacyResumeContext(
    context: SharePrivacyResumeContext
) {
    if (typeof window === "undefined") {
        return false;
    }

    const storageKey = getSharePrivacyResumeStorageKey(context);
    const shouldResume = window.sessionStorage.getItem(storageKey) === "true";

    if (shouldResume) {
        window.sessionStorage.removeItem(storageKey);
    }

    return shouldResume;
}

export function isSafeAppPath(path: string) {
    return path.startsWith("/") && !path.startsWith("//");
}

export function buildSharePrivacyPolicyHref(returnToPath: string) {
    const safeReturnToPath = isSafeAppPath(returnToPath) ? returnToPath : "/";

    return `/privacy?returnTo=${encodeURIComponent(safeReturnToPath)}&from=share-confirmation`;
}
