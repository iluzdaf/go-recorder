import { cache } from "react";

import type { ShareRecord } from "../components/types";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { mapShareRowToShareRecord } from "./shareView";

type ShareLookupResult =
    | {
          ok: true;
          share: ShareRecord;
          durationMs: number;
      }
    | {
          ok: false;
          error: Error | null;
          durationMs: number;
      };

function shouldLogShareLookupTiming() {
    return process.env.SHARE_PAGE_TIMING === "1";
}

async function loadShareBySlug(slug: string): Promise<ShareLookupResult> {
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
        return {
            ok: false,
            error: new Error(error.message),
            durationMs,
        };
    }

    if (!data) {
        return {
            ok: false,
            error: null,
            durationMs,
        };
    }

    return {
        ok: true,
        share: mapShareRowToShareRecord(data),
        durationMs,
    };
}

export const getShareBySlug = cache(loadShareBySlug);
