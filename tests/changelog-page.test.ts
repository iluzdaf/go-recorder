import { describe, expect, it } from "vitest";

import ChangelogPage from "../app/changelog/page";
import ChangelogReleaseList from "../components/ChangelogReleaseList";
import { t } from "../lib/i18n";
import { getLatestRelease } from "../lib/changelog";

describe("/changelog page", () => {
    it("renders the changelog page shell", () => {
        const tree = ChangelogPage();

        expect(tree.type).toBe("main");
        expect(JSON.stringify(tree)).toContain(t("changelog"));
    });

    it("renders the latest release", () => {
        const tree = ChangelogReleaseList();
        const latestRelease = getLatestRelease();

        expect(JSON.stringify(tree)).toContain(`v${latestRelease?.version}`);
        expect(JSON.stringify(tree)).toContain(latestRelease?.title);
        expect(JSON.stringify(tree)).toContain(latestRelease?.items[0]?.text);
    });
});
