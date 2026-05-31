import { describe, expect, it, vi } from "vitest";

const mockRedirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
    redirect: mockRedirect,
}));

import GamesPage from "../app/games/page";

describe("/games page", () => {
    it("redirects to the local game creation form", async () => {
        await GamesPage();

        expect(mockRedirect).toHaveBeenCalledWith("/");
    });
});
