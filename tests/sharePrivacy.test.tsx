import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SharePrivacyDialog from "../components/SharePrivacyDialog";
import PrivacyPage from "../app/privacy/page";
import {
    buildSharePrivacyPolicyHref,
    consumeSharePrivacyResumeContext,
    acknowledgeSharePrivacy,
    hasAcknowledgedSharePrivacy,
    markSharePrivacyResumeContext,
} from "../lib/sharePrivacy";

vi.mock("next/link", () => ({
    default: ({
        children,
        href,
        ...props
    }: {
        children: ReactNode;
        href: string;
        [key: string]: unknown;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

function createStorageMock() {
    const store = new Map<string, string>();

    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
        removeItem: (key: string) => {
            store.delete(key);
        },
        clear: () => {
            store.clear();
        },
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("share privacy helpers", () => {
    it("tracks share privacy acknowledgement in local storage", () => {
        vi.stubGlobal("window", { localStorage: createStorageMock() });

        expect(hasAcknowledgedSharePrivacy()).toBe(false);
        acknowledgeSharePrivacy();
        expect(hasAcknowledgedSharePrivacy()).toBe(true);
    });

    it("tracks share privacy resume state in session storage", () => {
        vi.stubGlobal("window", {
            sessionStorage: createStorageMock(),
        });

        expect(
            consumeSharePrivacyResumeContext({ kind: "game", id: "game-1" })
        ).toBe(false);

        markSharePrivacyResumeContext({ kind: "game", id: "game-1" });

        expect(
            consumeSharePrivacyResumeContext({ kind: "game", id: "game-1" })
        ).toBe(true);

        expect(
            consumeSharePrivacyResumeContext({ kind: "game", id: "game-1" })
        ).toBe(false);
    });

    it("builds a same-tab privacy policy href with a return path", () => {
        expect(buildSharePrivacyPolicyHref("/games/abc")).toBe(
            "/privacy?returnTo=%2Fgames%2Fabc"
        );
    });
});

describe("share privacy UI", () => {
    it("renders the share privacy dialog with a policy link", () => {
        const markup = renderToStaticMarkup(
            <SharePrivacyDialog
                returnToPath="/games/abc"
                onCancel={vi.fn()}
                onReadPolicy={vi.fn()}
                onContinue={vi.fn()}
            />
        );

        expect(markup).toContain("Before you create a share");
        expect(markup).toContain("Read privacy policy");
        expect(markup).toContain("Continue to share");
        expect(markup).toContain(
            'href="/privacy?returnTo=%2Fgames%2Fabc"'
        );
        expect(markup).not.toContain('target="_blank"');
    });

    it("renders the privacy policy page", () => {
        return PrivacyPage({
            searchParams: Promise.resolve({ returnTo: "/drafts/abc" }),
        }).then((element) => {
            const markup = renderToStaticMarkup(element);

            expect(markup).toContain("Privacy policy");
            expect(markup).toContain("What we store");
            expect(markup).toContain("Retention");
            expect(markup).toContain('href="/drafts/abc"');
            expect(markup).toContain("Back to app");
        });
    });
});
