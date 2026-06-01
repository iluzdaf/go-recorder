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
