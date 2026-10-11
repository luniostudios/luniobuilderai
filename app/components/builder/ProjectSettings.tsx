"use client";

import { useState, type FormEvent } from "react";
import { Globe, Loader2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_SITE_METADATA, normalizeSiteMetadata, type SiteMetadata } from "@/lib/site-metadata";
import type { Database } from "@/lib/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

type Props = {
  project: Project;
  onProjectUpdated: (project: Project) => void;
};

export default function ProjectSettings({ project, onProjectUpdated }: Props) {
  const [name, setName] = useState(project.name);
  const [metadata, setMetadata] = useState<SiteMetadata>(
    () => normalizeSiteMetadata(project.site_metadata) ?? DEFAULT_SITE_METADATA,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function updateMetadata<K extends keyof SiteMetadata>(key: K, value: SiteMetadata[K]) {
    setMetadata((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 120) {
      setError("Project name must be between 1 and 120 characters.");
      return;
    }

    const normalizedMetadata = normalizeSiteMetadata(metadata);
    if (!normalizedMetadata) {
      setError("Check your URLs, theme color, and field lengths.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizedName, site_metadata: normalizedMetadata }),
      });
      const result = await response.json() as { error?: string; project?: Project };
      if (!response.ok || !result.project) throw new Error(result.error || "Could not save project settings.");
      onProjectUpdated(result.project);
      setName(result.project.name);
      setMetadata(normalizeSiteMetadata(result.project.site_metadata) ?? DEFAULT_SITE_METADATA);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save project settings.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60";
  const labelClass = "block min-w-0 space-y-1.5";

  return (
    <section className="min-h-0 flex-1 overflow-y-auto" aria-labelledby="project-settings-title">
      <div className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <h2 id="project-settings-title" className="font-heading text-xl font-semibold">Project settings</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed">Manage the website identity, search metadata, and social sharing details.</p>
            </div>
          </div>
          <Button type="submit" form="project-settings-form" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        {saved && <p role="status" className="mt-4 text-sm text-emerald-700">Settings saved.</p>}

        <form id="project-settings-form" onSubmit={saveSettings} className="grid gap-x-6 gap-y-5 py-6 md:grid-cols-2">
          <label className={labelClass}>
            <span className="text-sm font-medium">Project name</span>
            <input value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} maxLength={120} required disabled={saving} className={inputClass} />
            <span className="text-xs text-muted-foreground">Shown in your dashboard and builder.</span>
          </label>

          <label className={labelClass}>
            <span className="text-sm font-medium">Page title</span>
            <input value={metadata.title} onChange={(event) => updateMetadata("title", event.target.value)} maxLength={120} disabled={saving} placeholder={name || "My website"} className={inputClass} />
            <span className="text-xs text-muted-foreground">Used in browser tabs and search results. Falls back to the project name.</span>
          </label>

          <label className={`${labelClass} md:col-span-2`}>
            <span className="text-sm font-medium">Description</span>
            <textarea value={metadata.description} onChange={(event) => updateMetadata("description", event.target.value)} maxLength={320} rows={3} disabled={saving} placeholder="A short summary of this website" className="w-full resize-y rounded-md border border-input px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60" />
            <span className="text-xs text-muted-foreground">Used for search previews and social sharing.</span>
          </label>

          <label className={labelClass}>
            <span className="text-sm font-medium">Keywords</span>
            <input value={metadata.keywords} onChange={(event) => updateMetadata("keywords", event.target.value)} maxLength={500} disabled={saving} placeholder="design, studio, portfolio" className={inputClass} />
            <span className="text-xs text-muted-foreground">Separate keywords with commas.</span>
          </label>

          <label className={labelClass}>
            <span className="text-sm font-medium">Author</span>
            <input value={metadata.author} onChange={(event) => updateMetadata("author", event.target.value)} maxLength={100} disabled={saving} placeholder="Person or organization" className={inputClass} />
          </label>

          <label className={labelClass}>
            <span className="text-sm font-medium">Favicon URL</span>
            <input type="text" inputMode="url" value={metadata.faviconUrl} onChange={(event) => updateMetadata("faviconUrl", event.target.value)} maxLength={2048} disabled={saving} placeholder="https://... or /favicon.ico" className={inputClass} />
          </label>

          <label className={labelClass}>
            <span className="text-sm font-medium">Social preview image URL</span>
            <input type="text" inputMode="url" value={metadata.socialImageUrl} onChange={(event) => updateMetadata("socialImageUrl", event.target.value)} maxLength={2048} disabled={saving} placeholder="https://..." className={inputClass} />
          </label>

          <div className="space-y-1.5">
            <span className="block text-sm font-medium">Browser theme color</span>
            <div className="flex h-10 items-center gap-2">
              <input aria-label="Browser theme color" type="color" value={metadata.themeColor || "#ffffff"} onChange={(event) => updateMetadata("themeColor", event.target.value)} disabled={saving} className="h-10 w-12 cursor-pointer rounded-md border border-input p-1 disabled:opacity-60" />
              <span className="min-w-16 font-mono text-xs uppercase">{metadata.themeColor || "Default"}</span>
              {metadata.themeColor && (
                <Button type="button" variant="ghost" size="sm" onClick={() => updateMetadata("themeColor", "")} disabled={saving} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
