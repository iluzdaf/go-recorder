import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("Next.js config", () => {
    it("serves blocking metadata to social preview crawlers and curl checks", () => {
        expect(nextConfig.htmlLimitedBots).toBeInstanceOf(RegExp);
        expect(nextConfig.htmlLimitedBots?.test("WhatsApp/2.24.0")).toBe(true);
        expect(nextConfig.htmlLimitedBots?.test("facebookexternalhit/1.1")).toBe(
            true
        );
        expect(nextConfig.htmlLimitedBots?.test("curl/8.5.0")).toBe(true);
    });
});
