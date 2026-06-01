import enMessages from "./messages/en.json";

export const defaultLocale = "en";

export const messages = enMessages;

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey) {
    return messages[key];
}

export function formatShareCreated(path: string) {
    return `${t("shareCreated")}: ${path}`;
}

export function formatMoveEditError(error: string) {
    if (error === "Edit changes future captures") {
        return t("stoneCorrectionChangesCaptures");
    }

    if (error === "Multiple stones need a drag origin") {
        return t("stoneCorrectionNeedsDrag");
    }

    if (
        error === "Edit destination is out of bounds" ||
        error === "Ko prevented" ||
        error === "Overwrite prevented" ||
        error === "Suicide prevented"
    ) {
        return t("stoneCorrectionIllegal");
    }

    return t("stoneCorrectionFailed");
}
