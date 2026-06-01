import { describe, expect, it } from "vitest";

import { changelog, getLatestRelease } from "../lib/changelog";
import packageJson from "../package.json";

describe("changelog", () => {
    it("starts with the current package version", () => {
        expect(getLatestRelease()?.version).toBe(packageJson.version);
    });

    it("uses stable entry ids for user-facing release notes", () => {
        const ids = new Set<string>();

        for (const release of changelog) {
            expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
            expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(release.title.length).toBeGreaterThan(0);
            expect(Array.isArray(release.items)).toBe(true);

            for (const entry of release.items) {
                expect(entry.id).toMatch(/^[a-z0-9-]+$/);
                expect(entry.text.length).toBeGreaterThan(0);
                expect(ids.has(`${release.version}:${entry.id}`)).toBe(false);
                ids.add(`${release.version}:${entry.id}`);
            }
        }
    });
});
