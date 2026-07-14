import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ShareBoardLoader from "../../../components/ShareBoardLoader";
import {
    getShareDescription,
    getShareTitle,
} from "../../../lib/sharePresentation";
import { getShareBySlug } from "../../../lib/shareLookup";
import { getSiteUrl } from "../../../lib/siteUrl";

type PageProps = {
    params: Promise<{
        slug: string;
    }>;
};

// Shares are immutable, so the rendered page can be cached and served from the
// CDN instead of re-rendering and re-querying Supabase on every request. This
// keeps TTFB near edge latency for repeat visitors. The finite window lets a
// slug that 404s before it exists heal itself rather than caching the miss
// forever.
export const revalidate = 3600;

// An empty static-params list opts the dynamic [slug] route into on-demand ISR:
// unknown slugs are rendered on first request and then cached in the full-route
// (CDN) cache, so repeat visitors are served from the edge instead of
// re-rendering. Paths not listed here are still allowed (dynamicParams default).
export async function generateStaticParams() {
    return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;

    const result = await getShareBySlug(slug);
    if (!result.ok) {
        if (result.error) {
            throw result.error;
        }
        notFound();
    }

    const share = result.share;
    const title = getShareTitle({
        blackPlayerName: share.blackPlayerName,
        draftKind: share.draftKind,
        sourceKind: share.sourceKind,
        whitePlayerName: share.whitePlayerName,
    });
    const description = getShareDescription({
        draftKind: share.draftKind,
        sourceKind: share.sourceKind,
    });
    const imageUrl = new URL(
        `/shares/${encodeURIComponent(slug)}/opengraph-image`,
        getSiteUrl()
    ).toString();

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: "Shared Go game final position",
                    type: "image/png",
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [imageUrl],
        },
    };
}

export default async function SharePage({ params }: PageProps) {
    const { slug } = await params;

    const result = await getShareBySlug(slug);
    if (!result.ok) {
        if (result.error) {
            throw result.error;
        }
        notFound();
    }

    return (
        <main className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <ShareBoardLoader share={result.share} />
        </main>
    );
}
