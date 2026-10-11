"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Settings } from "lucide-react";
import type { Session } from "next-auth";
import type { Database } from "@/lib/database.types";
import ProjectCard from "@/app/components/dashboard/ProjectCard";
import ProfileSettings from "./ProfileSettings";
import type { UserRole } from "@/lib/project-limits";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type User = NonNullable<Session["user"]>;

export default function Dashboard({
  user,
  initialProjects,
  role,
  maxProjects,
  initialTab,
}: {
  user: User;
  initialProjects: Project[];
  role: UserRole;
  maxProjects: number | null;
  initialTab: "projects" | "settings";
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(initialTab);
  const atProjectLimit = maxProjects !== null && projects.length >= maxProjects;

  async function createProject(initialPrompt?: string) {
    if (atProjectLimit || creating) return;
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled site" }),
      });
      const result = await response.json() as { error?: string; project?: Project };
      if (!response.ok || !result.project) throw new Error(result.error || "Could not create project.");
      if (initialPrompt) {
        window.sessionStorage.setItem(`foundry:initial-prompt:${result.project.id}`, initialPrompt);
      }
      router.push(`/builder/${result.project.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create project.");
      setCreating(false);
    }
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete "${project.name}"? This can't be undone.`)) return;
    setError("");
    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Could not delete that website. Please try again.");
      return;
    }
    setProjects((current) => current.filter((item) => item.id !== project.id));
  }

  return (
    <div className="min-h-screen bg-white text-black py-30">
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <h1 className="font-bold text-4xl leading-tight sm:text-5xl">Welcome, {user.name}</h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Start with a sentence. Then keep asking — new sections, different colours, another page.
            </p>
            <p className="text-xs text-muted-foreground">
              {role} plan · {projects.length} / {maxProjects ?? "Unlimited"} websites
            </p>
          </div>
        </div>

        <nav aria-label="Dashboard sections" className="mt-8 flex gap-2 border-b border-border">
          <Link
            href="/dashboard?tab=projects"
            onClick={() => setActiveTab("projects")}
            aria-current={activeTab === "projects" ? "page" : undefined}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors ${activeTab === "projects" ? "border-brand" : "border-transparent"}`}
          >
            <LayoutDashboard size={16} /> Projects
          </Link>
          <Link
            href="/dashboard?tab=settings"
            onClick={() => setActiveTab("settings")}
            aria-current={activeTab === "settings" ? "page" : undefined}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors ${activeTab === "settings" ? "border-brand" : "border-transparent"}`}
          >
            <Settings size={16} /> Profile settings
          </Link>
        </nav>

        {activeTab === "settings" ? (
          <ProfileSettings name={user.name ?? ""} image={user.image ?? ""} />
        ) : (
          <>
            {error && <p role="alert" className="mt-6 text-sm text-destructive">{error}</p>}
            <div className="mt-10">
              {projects.length === 0 ? (
                <button
                  type="button"
                  onClick={() => void createProject()}
                  disabled={creating || atProjectLimit}
                  className="flex w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border bg-white px-8 py-20 text-center transition-colors hover:border-brand/40 hover:bg-brand/5"
                >
                  <span className="font-heading text-base font-semibold">Nothing here yet</span>
                  <span className="max-w-sm text-sm text-muted-foreground">Click here to create your first website.</span>
                </button>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} onDelete={deleteProject} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}