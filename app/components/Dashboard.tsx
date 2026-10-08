"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import type { Database } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import AppHeader from "@/app/components/AppHeader";
import ProjectCard from "@/app/components/ProjectCard";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type User = NonNullable<Session["user"]>;

export default function Dashboard({ user, initialProjects }: { user: User; initialProjects: Project[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function createProject() {
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled site" }),
      });
      if (!response.ok) throw new Error("Could not create project.");
      const result: { project: Project } = await response.json();
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
    <div className="min-h-screen bg-canvas">
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">Your websites</h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Start with a sentence. Then keep asking — new sections, different colours, another page.
            </p>
          </div>
          <Button size="lg" onClick={createProject} disabled={creating} className="gap-2 rounded-full px-6">
            {creating ? "Creating..." : "+ New website"}
          </Button>
        </div>

        {error && <p role="alert" className="mt-6 text-sm text-destructive">{error}</p>}
        <div className="mt-10">
          {projects.length === 0 ? (
            <button
              type="button"
              onClick={createProject}
              disabled={creating}
              className="flex w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-background/60 px-8 py-20 text-center transition-colors hover:border-brand/40 hover:bg-brand/5"
            >
              <span className="font-heading text-base font-semibold">Nothing here yet</span>
              <span className="max-w-sm text-sm text-muted-foreground">Create your first website.</span>
            </button>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} onDelete={deleteProject} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}