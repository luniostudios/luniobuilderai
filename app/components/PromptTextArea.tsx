"use client"

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Loader2 } from "lucide-react";
import type { Database } from "@/lib/database.types";
import ImageAttachments from "@/app/components/ImageAttachments";
import type { ImageAttachment } from "@/lib/image-attachments";
import { Button } from "@/components/ui/button";

type Project = Database["public"]["Tables"]["projects"]["Row"];

const PromptTextArea = ({ limitReached = false }: { limitReached?: boolean }) => {
    const router = useRouter();
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const [prompt, setPrompt] = useState("");
    const [images, setImages] = useState<ImageAttachment[]>([]);
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
        if ((!initialPrompt && !images.length) || creating || limitReached) return;
        void createProject(initialPrompt, images);
    }

    async function createProject(initialPrompt?: string, attachments: ImageAttachment[] = []) {
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
            if (initialPrompt || attachments.length) {
                window.sessionStorage.setItem(`foundry:initial-prompt:${result.project.id}`, JSON.stringify({ message: initialPrompt, images: attachments }));
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
                        disabled={creating || limitReached}
                        placeholder="A site for…"
                        className="prompt-textarea"
                    />
                    <ImageAttachments images={images} onChange={setImages} disabled={creating || limitReached} />
                    <div className="prompt-submit-row">
                        <span className="prompt-char-count">{prompt.length ? `${prompt.length} / 8000` : "Press enter to create"}</span>
                        <Button type="submit" size="lg" disabled={creating || limitReached || status === "loading" || (!prompt.trim() && !images.length)} className="prompt-submit">
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            {creating ? "Starting..." : status === "unauthenticated" ? "Sign in to create" : "Create my site"}
                        </Button>
                    </div>
                </div>
                <div className="prompt-starters" aria-label="Prompt ideas">
                    <span className="prompt-starters-label">TRY</span>
                    {starters.map((starter) => (
                        <button
                            key={starter.label}
                            type="button"
                            className="prompt-starter"
                            onClick={() => setPrompt(starter.prompt)}
                            disabled={creating || limitReached}
                        >
                            {starter.label}
                        </button>
                    ))}
                </div>
                {limitReached && <p className="prompt-error">You’ve reached your website limit. Delete a website to create another.</p>}
                {error && <p role="alert" className="prompt-error">{error}</p>}
            </form>
        </div>
    )
}

export default PromptTextArea