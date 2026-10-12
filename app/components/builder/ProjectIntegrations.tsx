"use client";

import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProjectIntegrations({ projectId }: { projectId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [key, setKey] = useState("");
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const endpoint = `/api/projects/${projectId}/integrations/unsplash`;

  useEffect(() => {
    let active = true;
    void fetch(endpoint)
      .then(async (response) => {
        const result = await response.json() as { configured?: boolean; error?: string };
        if (!response.ok) throw new Error(result.error || "Could not check API key status.");
        if (active) setConfigured(Boolean(result.configured));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not check API key status.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [endpoint]);

  async function saveKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!key.trim() || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const result = await response.json() as { configured?: boolean; error?: string };
      if (!response.ok || !result.configured) throw new Error(result.error || "Could not save API key.");
      setConfigured(true);
      setKey("");
      setNotice("Unsplash key saved securely. Ask LUNIO to continue with the integration.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save API key.");
    } finally {
      setSaving(false);
    }
  }

  async function removeKey() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const result = await response.json() as { configured?: boolean; error?: string };
      if (!response.ok || result.configured) throw new Error(result.error || "Could not remove API key.");
      setConfigured(false);
      setNotice("Unsplash key removed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove API key.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="shrink-0 border-t border-border/70 px-3 py-3 sm:px-4" aria-label="API integrations">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2 text-xs font-medium">
          {configured ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <KeyRound className="h-4 w-4" />}
          <span>API integrations</span>
          <span className="truncate font-normal text-muted-foreground">{loading ? "Checking…" : configured ? "Unsplash connected" : "Unsplash not connected"}</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{expanded ? "Hide" : "Manage"}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground">Keys are encrypted on the server and never added to chat history or website code.</p>
          {!configured && (
            <form onSubmit={saveKey} className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="unsplash-access-key">Unsplash access key</label>
              <input
                id="unsplash-access-key"
                type="password"
                autoComplete="new-password"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                disabled={saving}
                placeholder="Unsplash access key"
                className="h-9 min-w-0 flex-1 rounded-md border border-input px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <Button type="submit" size="lg" disabled={!key.trim() || saving} className="gap-2">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                Connect
              </Button>
            </form>
          )}
          {configured && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs">Access key connected</span>
              <Button type="button" size="sm" disabled={saving} onClick={() => void removeKey()} className="gap-2 bg-white text-red-500">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Remove key
              </Button>
            </div>
          )}
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          {notice && <p role="status" className="text-xs text-emerald-700">{notice}</p>}
        </div>
      )}
    </section>
  );
}
