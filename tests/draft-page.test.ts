import { describe, expect, it } from "vitest";

import DraftPage from "../app/drafts/[slug]/page";

describe("/drafts/[slug] page", () => {
    it("renders a draft board loader that reads the local draft id in the browser", () => {
        const tree = DraftPage();

        expect(tree.type).toBe("main");
        expect(tree.props.children.type.name).toBe("DraftBoardLoader");
    });
});
