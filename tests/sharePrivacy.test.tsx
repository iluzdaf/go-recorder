import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SharePrivacyDialog from "../components/SharePrivacyDialog";
import PrivacyPage from "../app/privacy/page";
import {
    acknowledgeSharePrivacy,
    hasAcknowledgedSharePrivacy,
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
});

describe("share privacy UI", () => {
    it("renders the share privacy dialog with a policy link", () => {
        const markup = renderToStaticMarkup(
            <SharePrivacyDialog onCancel={vi.fn()} onContinue={vi.fn()} />
        );

        expect(markup).toContain("Before you create a share");
        expect(markup).toContain("Read privacy policy");
        expect(markup).toContain("Continue to share");
    });

    it("renders the privacy policy page", () => {
        const markup = renderToStaticMarkup(<PrivacyPage />);

        expect(markup).toContain("Privacy policy");
        expect(markup).toContain("What we store");
        expect(markup).toContain("Retention");
        expect(markup).toContain("Back to app");
    });
});
