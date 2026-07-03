import { describe, expect, it } from "vitest";

import ChangelogPage from "../app/changelog/page";
import PrivacyPage from "../app/privacy/page";
import SettingsPage from "../app/settings/page";
import SecondaryPageShell from "../components/SecondaryPageShell";
import { t } from "../lib/i18n";

function collectClassNames(node: unknown): string[] {
    if (!node || typeof node !== "object") {
        return [];
    }

    if (Array.isArray(node)) {
        return node.flatMap(collectClassNames);
    }

    const props = (node as { props?: { className?: string; children?: unknown } })
        .props;

    return [
        ...(typeof props?.className === "string" ? [props.className] : []),
        ...collectClassNames(props?.children),
    ];
}

describe("SecondaryPageShell", () => {
    it("renders the shared secondary page layout contract", () => {
        const tree = SecondaryPageShell({
            title: "Example",
            children: <p>Content</p>,
        });
        const output = JSON.stringify(tree);

        expect(tree.type).toBe("main");
        expect(output).toContain("flex min-h-0 flex-1 flex-col overflow-auto");
        expect(output).toContain("p-6");
        expect(output).toContain("text-right text-lg font-semibold");
        expect(output).toContain("flex min-h-full w-full flex-col gap-5");
    });

    it("uses the shared shell on document-style secondary pages", () => {
        const tree = ChangelogPage();

        expect(tree.type).toBe(SecondaryPageShell);
        expect(tree.props.title).toBe(t("changelog"));
    });

    it("uses the shared shell on the settings page", () => {
        const tree = SettingsPage();

        expect(tree.type).toBe(SecondaryPageShell);
        expect(tree.props.title).toBe(t("settings"));
    });

    it("keeps privacy document text readable inside the full-width shell", async () => {
        const tree = await PrivacyPage({
            searchParams: Promise.resolve({ returnTo: "/games" }),
        });
        const classNames = collectClassNames(tree.props.children);

        expect(tree.type).toBe(SecondaryPageShell);
        expect(tree.props.title).toBe(t("privacyPolicyTitle"));
        expect(classNames.join(" ")).not.toContain("max-w-2xl");
        expect(classNames.join(" ")).toContain("max-w-3xl");
    });
});
