"use client"

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import type { Database } from "@/lib/database.types";
import { Button } from "@/components/ui/button";

type Project = Database["public"]["Tables"]["projects"]["Row"];

const PromptTextArea = () => {

    const router = useRouter();
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const [prompt, setPrompt] = useState("");

      const session = useSession();

    function handleGenerate(event: FormEvent<HTMLFormElement>) {
        if (!session) window.location.href = '/login'
        event.preventDefault();
        const initialPrompt = prompt.trim();
        if (!initialPrompt || creating) return;
        void createProject(initialPrompt);
    }

    async function createProject(initialPrompt?: string) {
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
            if (initialPrompt) {
                window.sessionStorage.setItem(`foundry:initial-prompt:${result.project.id}`, initialPrompt);
            }
            router.push(`/builder/${result.project.id}`);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not create project.");
            setCreating(false);
        }
    }

    return (
        <div>
            <form onSubmit={handleGenerate} className="mt-8 border-y border-border/70 bg-background/55 px-4 py-5 sm:px-6 sm:py-6">
                <label htmlFor="website-prompt" className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-brand" />
                    What would you like to make?
                </label>
                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
                    <textarea
                        id="website-prompt"
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        maxLength={8000}
                        rows={3}
                        disabled={creating}
                        placeholder="Describe your website, who it’s for, and the feeling you want it to have…"
                        className="min-h-24 min-w-0 flex-1 resize-y rounded-md border border-input bg-background px-3.5 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/75 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
                    />
                    <Button type="submit" size="lg" disabled={creating || !prompt.trim()} className="h-12 shrink-0 gap-2 px-6">
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        {creating ? "Starting..." : "Generate website"}
                    </Button>
                </div>
            </form></div>
    )
}

export default PromptTextArea