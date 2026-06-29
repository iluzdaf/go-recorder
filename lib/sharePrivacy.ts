const SHARE_PRIVACY_ACK_STORAGE_KEY =
    "go-recorder:share-privacy-acknowledged:v1";

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
