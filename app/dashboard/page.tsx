import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import { getSupabaseAdmin } from "@/lib/db";
import Dashboard from "@/app/components/Dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=%2Fdashboard");

  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .select("*")
    .eq("owner_id", session.user.id)
    .order("updated_date", { ascending: false });

  if (error) throw new Error("Could not load your projects.");

  const projects = data as unknown as Database["public"]["Tables"]["projects"]["Row"][];
  return (
    <SessionProvider session={session}>
      <Dashboard user={session.user} initialProjects={projects} />
    </SessionProvider>
  );
}