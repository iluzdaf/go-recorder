import { describe, expect, it } from "vitest";

import ChangelogPage from "../app/changelog/page";
import { getLatestRelease } from "../lib/changelog";

describe("/changelog page", () => {
    it("renders the latest release", () => {
        const tree = ChangelogPage();
        const latestRelease = getLatestRelease();

        expect(tree.type).toBe("main");
        expect(JSON.stringify(tree)).toContain(`v${latestRelease?.version}`);
        expect(JSON.stringify(tree)).toContain(latestRelease?.title);
        expect(JSON.stringify(tree)).toContain(latestRelease?.items[0]?.text);
    });
});
