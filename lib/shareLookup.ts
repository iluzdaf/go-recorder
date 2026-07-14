import { unstable_cache } from "next/cache";
import { cache } from "react";

import type { ShareRecord } from "../components/types";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { mapShareRowToShareRecord } from "./shareView";

type ShareLookupResult =
    | {
          ok: true;
          share: ShareRecord;
      }
    | {
          ok: false;
          error: Error | null;
      };

const SHARE_LOOKUP_REVALIDATE_SECONDS = 3600;

function shouldLogShareLookupTiming() {
    return process.env.SHARE_PAGE_TIMING === "1";
}

// Throws on Supabase errors so a transient failure is never cached; returns
// null for a genuinely missing share, which is safe to cache as a 404 for the
// revalidate window.
async function fetchShareRow(slug: string): Promise<ShareRecord | null> {
    const start = performance.now();
    const { data, error } = await getSupabaseAdmin()
        .from("shares")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
    const durationMs = performance.now() - start;

    if (shouldLogShareLookupTiming()) {
        console.info(
            `[share-page] Supabase share lookup slug=${slug} durationMs=${durationMs.toFixed(
                1
            )}`
        );
    }

    if (error) {
        throw new Error(error.message);
    }

    return data ? mapShareRowToShareRecord(data) : null;
}

// Immutable shares are cached in the Next data cache across requests, keyed by
// slug. This removes the Supabase round trip from the render path so the share
// page can be statically cached and served from the CDN instead of re-querying
// on every request.
const fetchShareRowCached = unstable_cache(fetchShareRow, ["share-by-slug"], {
    revalidate: SHARE_LOOKUP_REVALIDATE_SECONDS,
});

// React cache dedupes the lookup within a single render so generateMetadata and
// the page component share one call.
export const getShareBySlug = cache(
    async (slug: string): Promise<ShareLookupResult> => {
        try {
            const share = await fetchShareRowCached(slug);

            return share
                ? { ok: true, share }
                : { ok: false, error: null };
        } catch (error) {
            return {
                ok: false,
                error:
                    error instanceof Error
                        ? error
                        : new Error("Share lookup failed"),
            };
        }
    }
);
