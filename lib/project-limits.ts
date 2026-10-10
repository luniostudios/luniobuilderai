import { getSupabaseAdmin } from "@/lib/db";

export type UserRole = "FREE" | "PRO" | "BUSINESS" | "STAFF" | "ADMIN" | "MANAGER" | "OWNER";

export const PROJECT_LIMITS: Record<UserRole, number | null> = {
  FREE: 1,
  PRO: 5,
  BUSINESS: 25,
  STAFF: null,
  ADMIN: null,
  MANAGER: null,
  OWNER: null,
};

function isUserRole(role: string): role is UserRole {
  return Object.prototype.hasOwnProperty.call(PROJECT_LIMITS, role);
}

export async function getUserProjectLimit(
  userId: string,
): Promise<{ role: UserRole; limit: number | null } | { error: string }> {
  const { data, error } = await getSupabaseAdmin()
    .schema("next_auth")
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { error: "Could not load account role." };
  if (!data || !isUserRole(data.role)) return { error: "Account has an unsupported role." };

  return { role: data.role, limit: PROJECT_LIMITS[data.role] };
}
