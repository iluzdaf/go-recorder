import enChangelog from "../content/changelog/en.json";

export type ChangelogEntry = {
    id: string;
    text: string;
};

export type ChangelogRelease = {
    version: string;
    date: string;
    title: string;
    items: ChangelogEntry[];
};

export const changelog = enChangelog satisfies ChangelogRelease[];

export function getLatestRelease() {
    return changelog[0] ?? null;
}
