"use client";

import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MODEL_PROVIDERS, type ModelProvider } from "@/lib/ai-models";

type ModelSettingsResponse = {
  configured: Record<ModelProvider, boolean>;
  error?: string;
};

export default function ModelApiKeys() {
  const [configured, setConfigured] = useState<Record<ModelProvider, boolean>>({
    google: false,
    openai: false,
    anthropic: false,
  });
  const [keys, setKeys] = useState<Record<ModelProvider, string>>({
    google: "",
    openai: "",
    anthropic: "",
  });
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<ModelProvider | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/account/model-settings")
      .then(async (response) => {
        const result = await response.json() as ModelSettingsResponse;
        if (!response.ok) throw new Error(result.error || "Could not load model API key status.");
        if (active) setConfigured(result.configured);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load model API key status.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function saveKey(event: FormEvent<HTMLFormElement>, provider: ModelProvider) {
    event.preventDefault();
    const key = keys[provider].trim();
    if (!key || savingProvider) return;
    setSavingProvider(provider);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/account/model-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key }),
      });
      const result = await response.json() as { configured?: boolean; error?: string };
      if (!response.ok || !result.configured) throw new Error(result.error || "Could not save the API key.");
      setConfigured((current) => ({ ...current, [provider]: true }));
      setKeys((current) => ({ ...current, [provider]: "" }));
      setNotice(`${MODEL_PROVIDERS.find((item) => item.id === provider)?.label} key saved securely.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the API key.");
    } finally {
      setSavingProvider(null);
    }
  }

  async function removeKey(provider: ModelProvider) {
    setSavingProvider(provider);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/account/model-settings?provider=${provider}`, { method: "DELETE" });
      const result = await response.json() as { configured?: boolean; error?: string };
      if (!response.ok || result.configured) throw new Error(result.error || "Could not remove the API key.");
      setConfigured((current) => ({ ...current, [provider]: false }));
      setNotice(`${MODEL_PROVIDERS.find((item) => item.id === provider)?.label} key removed.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove the API key.");
    } finally {
      setSavingProvider(null);
    }
  }

  return (
    <section className="mt-10 max-w-2xl space-y-5" aria-labelledby="model-api-keys-title">
      <div>
        <h2 id="model-api-keys-title" className="text-2xl font-semibold">Model API keys</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a key to use a model outside Auto. Keys are encrypted on the server and never sent to the browser after saving. Your provider may bill you directly for model usage.
        </p>
      </div>
      <div className="space-y-4">
        {MODEL_PROVIDERS.map(({ id, label }) => (
          <form key={id} onSubmit={(event) => void saveKey(event, id)} className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">{label}</h3>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                {configured[id] ? <ShieldCheck size={14} className="text-emerald-600" /> : <KeyRound size={14} />}
                {loading ? "Checking…" : configured[id] ? "Connected" : "Not connected"}
              </span>
            </div>
            {configured[id] ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Your saved key is hidden.</p>
                <Button type="button" size="sm" disabled={savingProvider !== null} onClick={() => void removeKey(id)} className="gap-2 bg-white text-red-500">
                  {savingProvider === id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Remove key
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor={`model-api-key-${id}`} className="sr-only">{label} API key</label>
                <input
                  id={`model-api-key-${id}`}
                  type="password"
                  autoComplete="new-password"
                  value={keys[id]}
                  onChange={(event) => setKeys((current) => ({ ...current, [id]: event.target.value }))}
                  disabled={savingProvider !== null}
                  placeholder={`${label} API key`}
                  className="h-10 min-w-0 flex-1 rounded-md border border-input px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                />
                <Button type="submit" size="lg" disabled={!keys[id].trim() || savingProvider !== null} className="gap-2">
                  {savingProvider === id ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Save key
                </Button>
              </div>
            )}
          </form>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    </section>
  );
}
