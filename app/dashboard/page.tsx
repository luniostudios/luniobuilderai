import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import { getSupabaseAdmin } from "@/lib/db";
import { getUserProjectLimit } from "@/lib/project-limits";
import Dashboard from "@/app/components/Dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=%2Fdashboard");

  const [projectsResult, accountLimit] = await Promise.all([
    getSupabaseAdmin()
      .from("projects")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("updated_date", { ascending: false }),
    getUserProjectLimit(session.user.id),
  ]);

  if (projectsResult.error) throw new Error("Could not load your projects.");
  if ("error" in accountLimit) throw new Error(accountLimit.error);

  const projects = projectsResult.data as unknown as Database["public"]["Tables"]["projects"]["Row"][];
  return (
    <SessionProvider session={session}>
      <Dashboard
        user={session.user}
        initialProjects={projects}
        role={accountLimit.role}
        maxProjects={accountLimit.limit}
      />
    </SessionProvider>
  );
}