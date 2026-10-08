"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, MessageSquare, Monitor, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";
import ElementStylePanel from "@/app/components/ElementStylePanel";
import { injectPreviewInspector, patchElementStyle, type SelectedElement } from "@/lib/preview-inspector";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type StoredMessage = Database["public"]["Tables"]["messages"]["Row"];
type ChatMessage = Pick<StoredMessage, "id" | "role" | "content" | "created_date">;
type ActivePanel = "chat" | "preview";

function isSelectedElement(value: unknown): value is SelectedElement {
  if (!value || typeof value !== "object") return false;
  if (
    !("selector" in value) || typeof value.selector !== "string" ||
    !("tagName" in value) || typeof value.tagName !== "string" ||
    !("id" in value) || typeof value.id !== "string" ||
    !("text" in value) || typeof value.text !== "string" ||
    !("styles" in value) || !value.styles || typeof value.styles !== "object"
  ) return false;

  return Object.values(value.styles).every((style) => typeof style === "string");
}

const SUGGESTIONS = [
  "Build a warm, editorial website for a neighborhood coffee shop.",
  "Create a bold portfolio for an independent product designer.",
  "Design a landing page for a small architecture studio.",
];

export default function BuilderClient({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activePanel, setActivePanel] = useState<ActivePanel>("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const styleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selection, setSelection] = useState<SelectedElement | null>(null);
  const [savingStyle, setSavingStyle] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProject() {
      try {
        const [projectResponse, messagesResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/messages`),
        ]);
        if (!projectResponse.ok) throw new Error("This website could not be found.");
        if (!messagesResponse.ok) throw new Error("The chat history could not be loaded.");

        const [{ project: loadedProject }, { messages: loadedMessages }] = await Promise.all([
          projectResponse.json() as Promise<{ project: Project }>,
          messagesResponse.json() as Promise<{ messages: ChatMessage[] }>,
        ]);
        if (!active) return;
        setProject(loadedProject);
        setMessages(loadedMessages);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load this website.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProject();
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, generating]);

  useEffect(() => {
    function handlePreviewMessage(event: MessageEvent<unknown>) {
      if (event.source !== previewRef.current?.contentWindow || !event.data || typeof event.data !== "object") return;
      const data = event.data as { type?: unknown; payload?: unknown };
      if (data.type !== "foundry:select" || !isSelectedElement(data.payload)) return;
      setSelection(data.payload);
      setActivePanel("preview");
    }

    window.addEventListener("message", handlePreviewMessage);
    return () => window.removeEventListener("message", handlePreviewMessage);
  }, []);

  useEffect(() => () => {
    if (styleSaveTimerRef.current) clearTimeout(styleSaveTimerRef.current);
  }, []);

  function restorePreviewSelection() {
    if (!selection) return;
    previewRef.current?.contentWindow?.postMessage({
      type: "foundry:select-element",
      selector: selection.selector,
    }, "*");
  }

  function handleStyleChange(property: string, value: string) {
    if (!project || !selection) return;
    const html = patchElementStyle(project.html, selection.selector, property, value);
    if (html === project.html) return;

    setProject((current) => current ? { ...current, html } : current);
    setSelection((current) => current ? {
      ...current,
      styles: { ...current.styles, [property]: value },
    } : current);
    setSavingStyle(true);

    if (styleSaveTimerRef.current) clearTimeout(styleSaveTimerRef.current);
    styleSaveTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html }),
        });
        if (!response.ok) throw new Error("Could not save style changes.");
        const result = (await response.json()) as { project: Project };
        setProject(result.project);
        setError("");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not save style changes.");
      } finally {
        setSavingStyle(false);
      }
    }, 600);
  }

  async function refreshMessages() {
    const response = await fetch(`/api/projects/${projectId}/messages`);
    if (!response.ok) return;
    const result = (await response.json()) as { messages: ChatMessage[] };
    setMessages(result.messages);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || generating) return;

    const pendingId = `pending-${Date.now()}`;
    const pendingMessage: ChatMessage = {
      id: pendingId,
      role: "user",
      content,
      created_date: new Date().toISOString(),
    };
    setMessages((current) => [...current, pendingMessage]);
    setDraft("");
    setError("");
    setGenerating(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const result = (await response.json()) as {
        error?: string;
        userMessage?: ChatMessage;
        assistantMessage?: ChatMessage;
        project?: Project;
      };
      if (!response.ok || !result.project || !result.userMessage || !result.assistantMessage) {
        throw new Error(result.error || "The website could not be updated.");
      }

      setMessages((current) => [
        ...current.filter((message) => message.id !== pendingId),
        result.userMessage!,
        result.assistantMessage!,
      ]);
      setProject(result.project);
    } catch (reason) {
      setMessages((current) => current.filter((message) => message.id !== pendingId));
      setDraft(content);
      setError(reason instanceof Error ? reason.message : "The website could not be updated.");
      void refreshMessages();
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading project" />
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
        <p className="text-sm text-muted-foreground">{error || "This website doesn't exist anymore."}</p>
        <Link href="/" className="text-sm font-medium text-primary hover:underline">Back to your websites</Link>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/70 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label="Back to projects"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-sm font-semibold">{project.name}</h1>
            <p className="text-[11px] text-muted-foreground">Website project</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${generating ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`} />
          {generating ? "Building" : "Saved"}
        </div>
      </header>

      <nav aria-label="Builder panels" className="flex h-11 shrink-0 border-b border-border/70 lg:hidden">
        <button
          type="button"
          aria-pressed={activePanel === "chat"}
          onClick={() => setActivePanel("chat")}
          className={`flex flex-1 items-center justify-center gap-2 text-sm ${activePanel === "chat" ? "border-b-2 border-foreground font-medium" : "text-muted-foreground"}`}
        >
          <MessageSquare className="h-4 w-4" /> Chat
        </button>
        <button
          type="button"
          aria-pressed={activePanel === "preview"}
          onClick={() => setActivePanel("preview")}
          className={`flex flex-1 items-center justify-center gap-2 text-sm ${activePanel === "preview" ? "border-b-2 border-foreground font-medium" : "text-muted-foreground"}`}
        >
          <Monitor className="h-4 w-4" /> Preview
        </button>
      </nav>

      <div className={`grid min-h-0 flex-1 ${selection ? "lg:grid-cols-[minmax(280px,350px)_minmax(0,1fr)_320px]" : "lg:grid-cols-[minmax(320px,390px)_minmax(0,1fr)]"}`}>
        <section className={`min-h-0 flex-col border-border/70 lg:flex lg:border-r ${activePanel === "chat" ? "flex" : "hidden"}`}>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-5">
            {messages.length === 0 ? (
              <div className="my-auto space-y-7 py-8">
                <div className="space-y-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <h2 className="font-display text-3xl leading-tight">What are we making?</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Describe your site, audience, and style. I’ll build the page and keep refining it with you.
                  </p>
                </div>
                <div className="space-y-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setDraft(suggestion)}
                      className="w-full rounded-xl border border-border/70 px-3.5 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((message) => (
                  <article key={message.id} className={message.role === "user" ? "ml-7" : "mr-4"}>
                    <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                      {message.role === "user" ? "You" : "Foundry"}
                    </p>
                    <div className={`rounded-2xl px-3.5 py-3 text-sm leading-relaxed ${message.role === "user" ? "rounded-br-md bg-foreground text-background" : "rounded-bl-md bg-muted/70 text-foreground"}`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </article>
                ))}
                {generating && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                    <Loader2 className="h-4 w-4 animate-spin" /> Designing your website…
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {error && <p role="alert" className="px-4 pb-2 text-xs leading-relaxed text-destructive">{error}</p>}
          <form onSubmit={handleSubmit} className="shrink-0 border-t border-border/70 p-3 sm:p-4">
            <div className="rounded-2xl border border-border/80 bg-background transition-colors focus-within:border-brand/50">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={3}
                maxLength={8000}
                disabled={generating}
                aria-label="Describe a website or request an edit"
                placeholder="Describe your website or ask for a change…"
                className="max-h-40 min-h-19 w-full resize-none bg-transparent px-3.5 pt-3 text-sm outline-none placeholder:text-muted-foreground/80 disabled:opacity-60"
              />
              <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
                <span className="text-[10px] text-muted-foreground">Enter to send · Shift + Enter for a new line</span>
                <Button type="submit" size="icon" aria-label="Send message" disabled={generating || !draft.trim()} className="h-8 w-8 rounded-full">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </form>
        </section>

        <section className={`min-h-0 flex-col bg-canvas lg:flex ${activePanel === "preview" ? "flex" : "hidden"}`}>
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 px-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Live preview</h2>
            </div>
            {project.html && <span className="text-[11px] text-muted-foreground">Updates after each change</span>}
          </div>
          <div className="relative min-h-0 flex-1 p-3 sm:p-5">
            {project.html ? (
              <iframe
                ref={previewRef}
                key={project.updated_date}
                title={`${project.name} live preview`}
                srcDoc={injectPreviewInspector(project.html)}
                sandbox="allow-scripts allow-forms allow-popups"
                onLoad={restorePreviewSelection}
                className="h-full w-full rounded-lg border border-border bg-white shadow-sm"
              />
            ) : (
              <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed border-border bg-background/60 px-8 text-center">
                <div className="max-w-sm space-y-3">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <Monitor className="h-5 w-5" />
                  </span>
                  <p className="font-heading text-sm font-semibold">Your website will appear here</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">Send a description in the chat to generate the first version.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {selection && (
          <section className="fixed inset-x-0 bottom-0 top-26 z-40 border-t border-border/70 shadow-2xl sm:left-auto sm:w-80 sm:border-l sm:border-t-0 lg:static lg:z-auto lg:h-full lg:w-auto lg:shadow-none">
            <ElementStylePanel
              key={selection.selector}
              selection={selection}
              saving={savingStyle}
              onChange={handleStyleChange}
              onClose={() => setSelection(null)}
            />
          </section>
        )}
      </div>
    </main>
  );
}