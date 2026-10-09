"use client"

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Loader2, Sparkles, WandSparkles } from "lucide-react";
import type { Database } from "@/lib/database.types";
import { Button } from "@/components/ui/button";

type Project = Database["public"]["Tables"]["projects"]["Row"];

const PromptTextArea = () => {
    const router = useRouter();
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const [prompt, setPrompt] = useState("");
    const { status } = useSession();

    const starters = [
        { label: "A portfolio", prompt: "A warm, editorial portfolio for a multidisciplinary designer, with a project gallery and a short personal introduction." },
        { label: "A neighborhood cafe", prompt: "A welcoming website for a neighborhood cafe, with a seasonal menu, opening hours, and a little story about the owners." },
        { label: "A new product", prompt: "A clear, confident launch page for a thoughtful productivity app, with its key features, customer quotes, and a sign-up form." },
    ];

    function handleGenerate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }
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
        <div className="prompt-composer">
            <form onSubmit={handleGenerate}>
                <div className="prompt-input-wrap">
                    <textarea
                        id="website-prompt"
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        maxLength={8000}
                        rows={4}
                        disabled={creating}
                        placeholder="A site for…"
                        className="prompt-textarea"
                    />
                    <div className="prompt-submit-row">
                        <span className="prompt-char-count">{prompt.length ? `${prompt.length} / 8000` : "Press enter to create"}</span>
                        <Button type="submit" size="lg" disabled={creating || status === "loading" || !prompt.trim()} className="prompt-submit">
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            {creating ? "Starting..." : status === "unauthenticated" ? "Sign in to create" : "Create my site"}
                        </Button>
                    </div>
                </div>
                <div className="prompt-starters" aria-label="Prompt ideas">
                    <span className="prompt-starters-label"><Sparkles size={13} /> TRY</span>
                    {starters.map((starter) => (
                        <button
                            key={starter.label}
                            type="button"
                            className="prompt-starter"
                            onClick={() => setPrompt(starter.prompt)}
                            disabled={creating}
                        >
                            {starter.label}
                        </button>
                    ))}
                </div>
                {error && <p role="alert" className="prompt-error">{error}</p>}
            </form>
        </div>
    )
}

export default PromptTextArea