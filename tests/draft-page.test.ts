import { describe, expect, it } from "vitest";

import DraftPage from "../app/drafts/[slug]/page";

describe("/drafts/[slug] page", () => {
    it("renders a draft board loader for the local draft id", async () => {
        const tree = await DraftPage({
            params: Promise.resolve({
                slug: "draft123",
            }),
        });

        expect(tree.type).toBe("main");
        expect(tree.props.children.props.id).toBe("draft123");
    });
});
