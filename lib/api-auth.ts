import { auth } from "@/lib/auth";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
}