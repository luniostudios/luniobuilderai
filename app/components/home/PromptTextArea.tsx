"use client"

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import type { Database } from "@/lib/database.types";
import ImageAttachments from "@/app/components/home/ImageAttachments";
import type { ImageAttachment } from "@/lib/image-attachments";
import { Button } from "@/components/ui/button";

type Project = Database["public"]["Tables"]["projects"]["Row"];

const PromptTextArea = ({ limitReached = false }: { limitReached?: boolean }) => {
    const router = useRouter();
    const [creating, setCreating] = useState(false);
    const [enhancing, setEnhancing] = useState(false);
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

    async function handleEnhance() {
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }
        const initialPrompt = prompt.trim();
        if (!initialPrompt || creating || enhancing || limitReached) return;

        setEnhancing(true);
        setError("");
        try {
            const response = await fetch("/api/prompts/enhance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: initialPrompt }),
            });
            const result = await response.json() as { error?: string; prompt?: string };
            if (!response.ok || !result.prompt) throw new Error(result.error || "Could not enhance your prompt.");
            setPrompt(result.prompt);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not enhance your prompt.");
        } finally {
            setEnhancing(false);
        }
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
        <div>
            <form onSubmit={handleGenerate}>

                <div className="rounded-sm border border-dashed border-white/15 p-3 shadow-[0_24px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    <button type="button" onClick={() => void handleEnhance()} disabled={creating || enhancing || limitReached || status === "loading" || !prompt.trim()} className="absolute right-5 inline-flex items-center gap-2 rounded-sm border border-white/15 px-3 py-2.5 text-sm font-medium text-white/75 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-35">
                        {enhancing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    </button>
                    <textarea
                        id="website-prompt"
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        maxLength={8000}
                        rows={4}
                        disabled={creating || enhancing || limitReached}
                        placeholder='Create a refined website for...'
                        className="w-full resize-none bg-transparent px-4 py-3 text-lg leading-7 text-white outline-none placeholder:text-white/25 sm:px-5 sm:text-xl"
                    />
                    <ImageAttachments images={images} onChange={setImages} disabled={creating || limitReached} />
                    <div className="flex flex-wrap items-center mt-3 justify-between border-t border-white/10 px-2 pt-3 sm:px-3">
                        <span className="prompt-char-count">{prompt.length ? `${prompt.length} / 8000` : "Press enter to create"}</span>
                        <div className="flex flex-row gap-3">
                            <button type="submit" disabled={creating || enhancing || limitReached || status === "loading" || (!prompt.trim() && !images.length)} className="inline-flex items-center gap-2 rounded-sm bg-[#b8f36b] px-4 py-2.5 text-sm font-semibold text-[#10150c] transition hover:bg-[#d0ff91] disabled:cursor-not-allowed disabled:opacity-35">
                                {creating ? <Loader2 size={17} className="animate-spin" /> : <ArrowUp size={17} />}
                                {creating ? "Starting..." : status === "unauthenticated" ? "Generate Website" : "Generate Website"}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="prompt-starters" aria-label="Prompt ideas">
                    <span className="prompt-starters-label">TRY</span>
                    {starters.map((starter) => (
                        <button
                            key={starter.label}
                            type="button"
                            className="rounded-sm border border-white/10 bg-white/2.5 px-3 py-2 text-left text-xs text-white/45 transition hover:border-white/25 hover:bg-white/7 hover:text-white/80"
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