import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ShareBoardLoader from "../../../components/ShareBoardLoader";
import { mapShareRowToShareRecord } from "../../../lib/shareView";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

type PageProps = {
    params: Promise<{
        slug: string;
    }>;
};

export const dynamic = "force-dynamic";

function getSiteUrl() {
    const vercelUrl = process.env.VERCEL_URL;
    const configuredUrl =
        process.env.VERCEL_ENV === "preview"
            ? vercelUrl ?? process.env.NEXT_PUBLIC_SITE_URL
            : process.env.NEXT_PUBLIC_SITE_URL ??
              process.env.VERCEL_PROJECT_PRODUCTION_URL ??
              vercelUrl;

    if (!configuredUrl) {
        return "http://localhost:3000";
    }

    return configuredUrl.startsWith("http")
        ? configuredUrl
        : `https://${configuredUrl}`;
}

function getShareTitle({
    blackPlayerName,
    whitePlayerName,
}: {
    blackPlayerName: string | null;
    whitePlayerName: string | null;
}) {
    const blackName = blackPlayerName?.trim();
    const whiteName = whitePlayerName?.trim();

    if (blackName && whiteName) {
        return `${blackName} vs ${whiteName}`;
    }

    return "Shared Go game";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;

    const { data, error } = await supabaseAdmin
        .from("shares")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!data) {
        notFound();
    }

    const share = mapShareRowToShareRecord(data);
    const title = getShareTitle({
        blackPlayerName: share.blackPlayerName,
        whitePlayerName: share.whitePlayerName,
    });
    const description = "View this shared Go game position.";
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

    const { data, error } = await supabaseAdmin
        .from("shares")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!data) {
        notFound();
    }

    return (
        <main className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <ShareBoardLoader share={mapShareRowToShareRecord(data)} />
        </main>
    );
}
