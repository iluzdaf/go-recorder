import { createClient } from "@supabase/supabase-js";

let cachedSupabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

function createSupabaseAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase admin environment variables");
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

export function getSupabaseAdmin() {
    if (cachedSupabaseAdmin) {
        return cachedSupabaseAdmin;
    }

    const client = createSupabaseAdminClient();
    cachedSupabaseAdmin = client;
    return client;
}
