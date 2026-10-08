import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import type { Database } from "@/lib/database.types";

const url = process.env.SUPABASE_URL as string;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!url || !secret) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable");
}

export default SupabaseAdapter({
  url,
  secret,
});

let adminClient: SupabaseClient<Database> | undefined;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (adminClient) return adminClient;
  adminClient = createClient<Database>(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}