import { SupabaseAdapter } from "@auth/supabase-adapter";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const url = process.env.SUPABASE_URL as string;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!url || !secret) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable");
}

const supabaseAdapter = SupabaseAdapter({
  url,
  secret,
});

export function getSupabaseAdmin() {
  return createClient<Database>(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export default supabaseAdapter;