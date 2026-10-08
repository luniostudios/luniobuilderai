import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import { getSupabaseAdmin } from "@/lib/supabase";
import Dashboard from "@/app/components/Dashboard";

export default function HomePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-canvas" />}>
      <AuthenticatedHome />
    </Suspense>
  );
}

async function AuthenticatedHome() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .select("*")
    .eq("owner_id", session.user.id)
    .order("updated_date", { ascending: false });

  if (error) throw new Error("Could not load your projects.");

  const projects = data as unknown as Database["public"]["Tables"]["projects"]["Row"][];
  return <Dashboard user={session.user} initialProjects={projects} />;
}