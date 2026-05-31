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
