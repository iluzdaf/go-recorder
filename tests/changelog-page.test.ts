import { describe, expect, it } from "vitest";

import ChangelogPage from "../app/changelog/page";
import ChangelogReleaseList from "../components/ChangelogReleaseList";
import SecondaryPageShell from "../components/SecondaryPageShell";
import { t } from "../lib/i18n";
import { changelog, getLatestRelease } from "../lib/changelog";

describe("/changelog page", () => {
    it("renders the changelog page in the shared secondary shell", () => {
        const tree = ChangelogPage();

        expect(tree.type).toBe(SecondaryPageShell);
        expect(JSON.stringify(tree)).toContain(t("changelog"));
    });

    it("renders the latest release", () => {
        const tree = ChangelogReleaseList();
        const latestRelease = getLatestRelease();

        expect(JSON.stringify(tree)).toContain(`v${latestRelease?.version}`);
        expect(JSON.stringify(tree)).toContain(latestRelease?.title);
        expect(JSON.stringify(tree)).toContain(latestRelease?.items[0]?.text);
    });

    it("can limit the release list", () => {
        const tree = ChangelogReleaseList({ limit: 2 });
        const output = JSON.stringify(tree);

        expect(output).toContain(`v${changelog[0]?.version}`);
        expect(output).toContain(`v${changelog[1]?.version}`);
        expect(output).not.toContain(`v${changelog[2]?.version}`);
    });
});
