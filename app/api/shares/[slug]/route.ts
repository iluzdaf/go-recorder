export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

type RouteContext = {
    params: Promise<{
        slug: string;
    }>;
};

export async function GET(
    request: Request,
    context: RouteContext
) {
    const { slug } = await context.params;

    const { data, error } = await supabaseAdmin
        .from("shares")
        .select("*")
        .eq("slug", slug)
        .single();

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 404 }
        );
    }

    return NextResponse.json(data);
}
