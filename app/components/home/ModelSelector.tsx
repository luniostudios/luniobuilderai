"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { AI_MODELS, type ModelId, type ModelProvider } from "@/lib/ai-models";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { IconHelpCircle } from "@tabler/icons-react";

type ModelSettingsResponse = {
  selectedModel: ModelId;
  configured: Record<ModelProvider, boolean>;
  error?: string;
};

export default function ModelSelector({ compact = false, dark = compact }: { compact?: boolean; dark?: boolean }) {
  const { status } = useSession();
  const [selectedModel, setSelectedModel] = useState<ModelId>("auto");
  const [configured, setConfigured] = useState<Record<ModelProvider, boolean>>({
    google: true,
    openai: false,
    anthropic: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const authenticated = status === "authenticated";
  const settingsLoading = loading && authenticated;

  useEffect(() => {
    if (!authenticated) return;

    let active = true;
    void fetch("/api/account/model-settings")
      .then(async (response) => {
        const result = await response.json() as ModelSettingsResponse;
        if (!response.ok) throw new Error(result.error || "Could not load model settings.");
        if (!active) return;
        setSelectedModel(result.selectedModel);
        setConfigured(result.configured);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load model settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [authenticated]);

  async function selectModel(model: string) {
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/account/model-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select-model", model }),
      });
      const result = await response.json() as { selectedModel?: ModelId; error?: string };
      if (!response.ok || !result.selectedModel) throw new Error(result.error || "Could not save your model selection.");
      setSelectedModel(result.selectedModel);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your model selection.");
    } finally {
      setSaving(false);
    }
  }

  const triggerClasses = compact && dark
    ? "h-9 rounded-sm border border-white/15 px-3 text-xs text-white outline-none disabled:opacity-50"
    : compact
      ? "h-9 min-w-48 rounded-md border border-border bg-background px-3 text-xs outline-none focus-visible:border-ring disabled:opacity-50"
      : "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50";
  const selectedModelLabel = AI_MODELS.find((model) => model.id === selectedModel)?.label ?? "Auto";

  return (
    <div className={compact ? "flex flex-wrap items-center gap-3" : "space-y-2"}>
      <div className={compact ? "flex flex-wrap items-center gap-2" : "space-y-2"}>
        <HoverCard>
          <HoverCardTrigger><IconHelpCircle className="text-white/20" size={16} stroke={2} /></HoverCardTrigger>
          <HoverCardContent className='w-72 flex flex-col gap-3 text-black rounded-xs p-4 bg-white border-2 border-blackshadow-lg'>
            <h2 className='text-md text-black font-bold'>Select the AI model you prefer.</h2>
            <hr />
            <p className='text-xs text-black font-medium'>Auto = FREE models.</p>
            <p className='text-xs text-black font-medium'>API Key = Use your own provider API key.</p>
            <hr />
            <p className='text-xs text-black'>Add provider API keys in <Link href="/dashboard?tab=settings" className='font-bold'>Settings</Link>.</p>
            <p className='text-xs text-black font-bold'>TIP: Better the model, better the results.</p>
          </HoverCardContent>
        </HoverCard>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={settingsLoading || saving || !authenticated}
            aria-label={`AI model: ${selectedModelLabel}`}
            className={`inline-flex items-center justify-between gap-2 max-md:w-20 ${triggerClasses}`}
          >
            <span className="truncate">{selectedModelLabel}</span>
            {settingsLoading || saving
              ? <Loader2 size={14} className="animate-spin" />
              : <ChevronDown size={14} />}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className='bg-background w-full max-h-[min(70vh,32rem)] border border-white/20 mt-2 rounded-xs p-2 overflow-y-auto [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-scrollbar-track [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb">'>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Choose a model</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={selectedModel}
                onValueChange={(value) => { if (value) void selectModel(value); }}
              >
                {AI_MODELS.map((model) => (
                  <DropdownMenuRadioItem
                    key={model.id}
                    value={model.id}
                    disabled={model.provider !== null && !configured[model.provider]}
                    className='text-sm max-md:text-xs text-white/80 flex flex-row justify-between gap-5 max-md:gap-2'
                  >
                    <span>{model.id === "auto" ? "Auto" : model.label}</span>
                    {model.provider !== null && !configured[model.provider] && (
                      <span className='text-[10px] text-white/50 border border-white/30 rounded-2xl px-2'>API Key</span>
                    )}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {error && (
          <p role="alert" className={compact && dark ? "basis-full text-xs text-red-300" : "text-sm text-destructive"}>
            {error}
            {error.includes("API key") && <> <Link href="/dashboard?tab=settings" className="underline underline-offset-2">Add it in profile settings.</Link></>}
          </p>
        )}
      </div>
    </div>
  );
}
