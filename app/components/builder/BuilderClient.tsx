"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Code2, Database as DatabaseIcon, Eye, ExternalLink, Globe, Loader2, LogOut, MessageSquare, Monitor, Pencil, Send, Smartphone, Sparkles, Tablet, Triangle, Settings, Loader, ChevronDown, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";
import ElementStylePanel from "@/app/components/builder/ElementStylePanel";
import CmsManager from "@/app/components/builder/CmsManager";
import ProjectSettings from "@/app/components/builder/ProjectSettings";
import ProjectCodeView from "@/app/components/builder/ProjectCodeView";
import ProjectIntegrations from "@/app/components/builder/ProjectIntegrations";
import { injectPreviewInspector, patchElementDelete, patchElementImage, patchElementStyle, patchElementText, type SelectedElement } from "@/lib/preview-inspector";
import { injectCmsContent, normalizeCmsData, toCmsJson } from "@/lib/cms";
import { injectSiteMetadata } from "@/lib/site-metadata";
import type { CmsData } from "@/lib/cms";
import ImageAttachments from "@/app/components/home/ImageAttachments";
import { parseImageAttachments, type ImageAttachment } from "@/lib/image-attachments";
import { signOut } from "next-auth/react";
import { IconBrandVercel } from "@tabler/icons-react";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type StoredMessage = Database["public"]["Tables"]["messages"]["Row"];
type ChatMessage = Pick<StoredMessage, "id" | "role" | "content" | "created_date">;
type ActivePanel = "chat" | "preview";
type BuilderView = "website" | "cms" | "settings" | "code";
type PreviewMode = "edit" | "preview";
type Breakpoint = "desktop" | "tablet" | "mobile";

const BREAKPOINTS: { id: Breakpoint; label: string; width: number | "100%"; icon: typeof Monitor }[] = [
  { id: "desktop", label: "Desktop", width: "100%", icon: Monitor },
  { id: "tablet", label: "Tablet", width: 768, icon: Tablet },
  { id: "mobile", label: "Mobile", width: 390, icon: Smartphone },
];

function isSelectedElement(value: unknown): value is SelectedElement {
  if (!value || typeof value !== "object") return false;
  if (
    !("selector" in value) || typeof value.selector !== "string" ||
    !("tagName" in value) || typeof value.tagName !== "string" ||
    !("id" in value) || typeof value.id !== "string" ||
    !("text" in value) || typeof value.text !== "string" ||
    !("imageUrl" in value) || typeof value.imageUrl !== "string" ||
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
  const [draftImages, setDraftImages] = useState<ImageAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activePanel, setActivePanel] = useState<ActivePanel>("chat");
  const [builderView, setBuilderView] = useState<BuilderView>("website");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("edit");
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selection, setSelection] = useState<SelectedElement | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingElement, setDeletingElement] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [showVercelDialog, setShowVercelDialog] = useState(false);
  const [vercelToken, setVercelToken] = useState("");
  const [vercelTeamId, setVercelTeamId] = useState("");
  const [vercelDeploying, setVercelDeploying] = useState(false);
  const [vercelError, setVercelError] = useState("");
  const [vercelDeploymentUrl, setVercelDeploymentUrl] = useState("");
  const [vercelTokenSaved, setVercelTokenSaved] = useState<boolean | null>(null);
  const initialPromptStartedRef = useRef(false);
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [published, setPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

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
      if (deletingElement) return;
      const data = event.data as { type?: unknown; payload?: unknown };
      if (previewMode === "edit" && data.type === "foundry:select" && isSelectedElement(data.payload)) {
        setSelection(data.payload);
        setDeleteError("");
        setActivePanel("preview");
        return;
      }
      if (
        data.type !== "foundry:text-change" ||
        !data.payload || typeof data.payload !== "object" ||
        !("selector" in data.payload) || typeof data.payload.selector !== "string" ||
        !("text" in data.payload) || typeof data.payload.text !== "string" ||
        !project
      ) return;

      const html = patchElementText(project.html, data.payload.selector, data.payload.text);
      if (html === project.html) return;
      setProject((current) => current ? { ...current, html } : current);
      setSavingStyle(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ html }),
          });
          if (!response.ok) throw new Error("Could not save text changes.");
          const result = (await response.json()) as { project: Project };
          setProject(result.project);
          setError("");
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : "Could not save text changes.");
        } finally {
          setSavingStyle(false);
        }
      }, 600);
    }

    window.addEventListener("message", handlePreviewMessage);
    return () => window.removeEventListener("message", handlePreviewMessage);
  }, [deletingElement, previewMode, project, projectId]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  function restorePreviewSelection() {
    const previewWindow = previewRef.current?.contentWindow;
    if (!previewWindow) return;
    previewWindow.postMessage({ type: "foundry:set-mode", mode: previewMode }, "*");
    if (previewMode !== "edit" || !selection) return;
    previewWindow.postMessage({
      type: "foundry:select-element",
      selector: selection.selector,
    }, "*");
  }

  useEffect(() => {
    previewRef.current?.contentWindow?.postMessage({ type: "foundry:set-mode", mode: previewMode }, "*");
  }, [previewMode]);

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

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
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

  function handleImageUrlChange(imageUrl: string) {
    if (!project || !selection) return;
    const html = patchElementImage(project.html, selection.selector, imageUrl);
    if (html === project.html) return;

    setProject((current) => current ? { ...current, html } : current);
    setSelection((current) => current ? { ...current, imageUrl } : current);
    setSavingStyle(true);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html }),
        });
        if (!response.ok) throw new Error("Could not save image changes.");
        const result = (await response.json()) as { project: Project };
        setProject(result.project);
        setError("");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not save image changes.");
      } finally {
        setSavingStyle(false);
      }
    }, 600);
  }

  async function handleDeleteElement() {
    if (!project || !selection || savingStyle) return;
    const elementName = selection.id ? `${selection.tagName}#${selection.id}` : selection.tagName;
    if (!window.confirm(`Delete the selected ${elementName}? This can't be undone.`)) return;

    const html = patchElementDelete(project.html, selection.selector);
    if (html === project.html) {
      setDeleteError("Could not delete the selected element.");
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setDeleteError("");
    setDeletingElement(true);
    setSavingStyle(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      const result = (await response.json()) as { error?: string; project?: Project };
      if (!response.ok || !result.project) {
        throw new Error(result.error || "Could not delete the selected element.");
      }
      setProject(result.project);
      setSelection(null);
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : "Could not delete the selected element.");
    } finally {
      setDeletingElement(false);
      setSavingStyle(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, { method: "POST" });
      const result = (await response.json()) as { error?: string; project?: Project };
      if (!response.ok || !result.project) throw new Error(result.error || "Could not publish website.");
      setProject(result.project);
    } catch (reason) {
      setPublishError(reason instanceof Error ? reason.message : "Could not publish website.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish() {
    setPublishing(true);
    setPublishError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, { method: "DELETE" });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "Could not unpublish website.");
      }
      setProject((current) => current ? { ...current, published_slug: null, published_at: null } : current);
    } catch (reason) {
      setPublishError(reason instanceof Error ? reason.message : "Could not unpublish website.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleVercelDeploy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (vercelDeploying) return;
    setVercelDeploying(true);
    setVercelError("");
    setVercelDeploymentUrl("");
    setVercelTokenSaved(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/deploy-vercel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: vercelToken.trim() || undefined, teamId: vercelTeamId.trim() || undefined }),
      });
      const result = await response.json() as { error?: string; url?: string; tokenSaved?: boolean };
      if (!response.ok || !result.url) {
        throw new Error(result.error || "Could not deploy to Vercel.");
      }
      setVercelDeploymentUrl(result.url);
      setVercelTokenSaved(result.tokenSaved ?? false);
      setVercelToken("");
    } catch (reason) {
      setVercelError(reason instanceof Error ? reason.message : "Could not deploy to Vercel.");
    } finally {
      setVercelDeploying(false);
    }
  }

  function closeVercelDialog() {
    if (vercelDeploying) return;
    setShowVercelDialog(false);
    setVercelToken("");
    setVercelTeamId("");
    setVercelError("");
    setVercelDeploymentUrl("");
    setVercelTokenSaved(null);
  }

  async function saveCmsData(cmsData: CmsData): Promise<string | null> {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cms_data: toCmsJson(cmsData) }),
      });
      const result = await response.json() as { error?: string; project?: Project };
      if (!response.ok || !result.project) return result.error || "Could not save CMS changes.";
      setProject(result.project);
      return null;
    } catch {
      return "Could not save CMS changes. Check your connection and try again.";
    }
  }

  const refreshMessages = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/messages`);
    if (!response.ok) return;
    const result = (await response.json()) as { messages: ChatMessage[] };
    setMessages(result.messages);
  }, [projectId]);

  const sendPrompt = useCallback(async (content: string, attachments: ImageAttachment[] = []) => {
    const messageContent = content.trim() || (attachments.length ? "Use the attached image(s) to build my website." : "");
    if (!messageContent || generating) return;
    const pendingId = `pending-${Date.now()}`;
    const pendingMessage: ChatMessage = {
      id: pendingId,
      role: "user",
      content: messageContent,
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
        body: JSON.stringify({ message: messageContent, images: attachments }),
      });
      const result = (await response.json()) as {
        error?: string;
        code?: string;
        userMessage?: ChatMessage;
        assistantMessage?: ChatMessage;
        project?: Project;
      };
      if (!response.ok || !result.project || !result.userMessage || !result.assistantMessage) {
        if (result.code === "SECRET_INPUT_REJECTED") {
          setMessages((current) => current.filter((message) => message.id !== pendingId));
          setDraft("");
          setError(result.error || "Use the secure API integrations control to add an API key.");
          return;
        }
        throw new Error(result.error || "The website could not be updated.");
      }

      setMessages((current) => [
        ...current.filter((message) => message.id !== pendingId),
        result.userMessage!,
        result.assistantMessage!,
      ]);
      setProject(result.project);
      setDraftImages([]);
    } catch (reason) {
      setMessages((current) => current.filter((message) => message.id !== pendingId));
      setDraft(messageContent);
      setError(reason instanceof Error ? reason.message : "The website could not be updated.");
      void refreshMessages();
    } finally {
      setGenerating(false);
    }
  }, [generating, projectId, refreshMessages]);

  useEffect(() => {
    if (loading || !project || messages.length > 0 || initialPromptStartedRef.current) return;
    const storageKey = `foundry:initial-prompt:${projectId}`;
    const storedPrompt = window.sessionStorage.getItem(storageKey);
    if (!storedPrompt) return;

    let initialPrompt = "";
    let initialImages: ImageAttachment[] = [];
    try {
      const parsed: unknown = JSON.parse(storedPrompt);
      if (parsed && typeof parsed === "object" && "message" in parsed && typeof parsed.message === "string") {
        initialPrompt = parsed.message.trim();
        initialImages = parseImageAttachments("images" in parsed ? parsed.images : undefined) ?? [];
      } else if (typeof parsed === "string") {
        initialPrompt = parsed.trim();
      }
    } catch {
      initialPrompt = storedPrompt.trim();
    }
    if (!initialPrompt && !initialImages.length) return;

    initialPromptStartedRef.current = true;
    window.sessionStorage.removeItem(storageKey);
    window.setTimeout(() => void sendPrompt(initialPrompt, initialImages), 0);
  }, [loading, messages.length, project, projectId, sendPrompt]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendPrompt(draft.trim(), draftImages);
  }

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading project" />
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
        <p className="text-sm">{error || "This website doesn't exist anymore."}</p>
        <a href="/dashboard" className="text-sm font-medium text-primary hover:underline">Back to your websites</a>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-white text-black dark:bg-black dark:text-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/70 px-4">
        <div className="flex flex-row items-center gap-2">
          <Link href="/dashboard" className="flex flex-row items-center gap-1 text-sm font-medium text-primary hover:underline">
            <ChevronLeft size={16} />
          </Link>
          <span className="font-bold">{project?.name || 'Untitled'}</span>
        </div>
        {/* Publish */}
        <div className="relative">
          <div className="flex items-center">
            <button
              onClick={() => setShowPublishMenu(!showPublishMenu)}
              disabled={isPublishing}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-medium transition-all ${published
                ? 'bg-green-600 text-white'
                : 'bg-black text-white'
                } ${isPublishing ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isPublishing ? (
                <>
                  <Loader size={12} />
                  Publishing...
                </>
              ) : published ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                  Published!
                </>
              ) : (
                <>
                  Publish
                  <ChevronDown size={14} />
                </>
              )}
            </button>
          </div>

          {showPublishMenu && (
            <div className="absolute top-full right-0 mt-1 px-4 w-48 bg-black border border-gray-700 rounded-sm shadow-2xl py-2 z-50">
              <button
                onClick={published ? handleUnpublish : handlePublish}
                disabled={!project || isPublishing}
                className={`w-full flex items-center gap-2 px-2 py-2 text-xs ${project ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-600 cursor-not-allowed'} transition-colors`}
              >
                <Globe size={12} />
                Publish to LUNIO
                {project.published_slug && (
                    <a
                      href={`/sites/${project.published_slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </button>
              <button
                onClick={() => setShowVercelDialog(true)}
                className="w-full flex items-center gap-2 px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <IconBrandVercel stroke={2} size={12} />
                Publish to Vercel
              </button>
              <div className="border-t border-gray-800 mt-1 pt-1">
                <Link
                  href={`/dashboard/settings/${projectId}`}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <Settings size={12} />
                  Site settings
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {publishError && <p role="alert" className="shrink-0 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive">{publishError}</p>}

      {showVercelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeVercelDialog();
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="vercel-deploy-title"
            className="w-full max-w-md rounded-xl bg-white border border-border p-5 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="vercel-deploy-title" className="font-heading text-base font-semibold">Deploy to Vercel</h2>
                <p className="mt-1 text-sm leading-relaxed">
                  Deploy this website as a static site in your Vercel account.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close Vercel deployment dialog"
                onClick={closeVercelDialog}
                disabled={vercelDeploying}
                className="rounded-full p-1.5 disabled:opacity-50"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            {vercelDeploymentUrl ? (
              <div className="space-y-4">
                <p className="text-sm">Your Vercel deployment has been created.</p>
                {vercelTokenSaved === false && <p role="status" className="text-sm text-destructive">The deployment succeeded, but the access token could not be saved. You will need to enter it again next time.</p>}
                <a
                  href={vercelDeploymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block break-all text-sm font-medium text-primary underline underline-offset-4"
                >
                  {vercelDeploymentUrl}
                </a>
                <p className="text-xs leading-relaxed">
                  Vercel may take a moment to finish activating the site.
                </p>
                <div className="flex justify-end">
                  <Button type="button" onClick={closeVercelDialog}>Done</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVercelDeploy} className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Vercel access token</span>
                  <input
                    type="password"
                    value={vercelToken}
                    onChange={(event) => setVercelToken(event.target.value)}
                    autoComplete="off"
                    maxLength={512}
                    disabled={vercelDeploying || project.encrypted_vercel_token !== null}
                    placeholder={project.encrypted_vercel_token !== null ? "You have a saved token, just press Deploy" : "Enter a Vercel access token"}
                    className="h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                  <p className="text-xs leading-relaxed">Enter a token for the first deployment or to replace the saved token.</p>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Team ID <span className="font-normal">(optional)</span></span>
                  <input
                    value={vercelTeamId}
                    onChange={(event) => setVercelTeamId(event.target.value)}
                    autoComplete="off"
                    maxLength={128}
                    disabled={vercelDeploying}
                    placeholder="Use your personal account if blank"
                    className="h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </label>
                <p className="text-xs leading-relaxed">
                  Create a token in{" "}
                  <a href="https://vercel.com/account/tokens" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    Vercel account settings
                  </a>
                  . The token is encrypted and saved with this website after a successful deployment.
                </p>
                {vercelError && <p role="alert" className="text-sm text-destructive">{vercelError}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" onClick={closeVercelDialog} disabled={vercelDeploying}>Cancel</Button>
                  <Button type="submit" disabled={vercelDeploying}>
                    {vercelDeploying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deploying…</> : "Deploy"}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      <nav aria-label="Builder workspace" className="flex h-11 shrink-0 border-b border-border/70">
        <button
          type="button"
          aria-pressed={builderView === "website"}
          onClick={() => setBuilderView("website")}
          className={`flex items-center gap-2 border-b-2 px-5 text-sm ${builderView === "website" ? " font-medium" : "border-transparent "}`}
        >
          <Monitor className="h-4 w-4" /> Website
        </button>
        <button
          type="button"
          aria-pressed={builderView === "cms"}
          onClick={() => setBuilderView("cms")}
          className={`flex items-center gap-2 border-b-2 px-5 text-sm ${builderView === "cms" ? " font-medium" : "border-transparent"}`}
        >
          <DatabaseIcon className="h-4 w-4" /> CMS
          {(normalizeCmsData(project.cms_data)?.collections.length ?? 0) > 0 && <span className="text-xs tabular-nums">{normalizeCmsData(project.cms_data)?.collections.length}</span>}
        </button>
        <button
          type="button"
          aria-pressed={builderView === "settings"}
          onClick={() => setBuilderView("settings")}
          className={`flex items-center gap-2 border-b-2 px-5 text-sm ${builderView === "settings" ? " font-medium" : "border-transparent"}`}
        >
          <Settings className="h-4 w-4" /> Settings
        </button>
        <button
          type="button"
          aria-pressed={builderView === "code"}
          onClick={() => setBuilderView("code")}
          className={`flex items-center gap-2 border-b-2 px-5 text-sm ${builderView === "code" ? " font-medium" : "border-transparent"}`}
        >
          <Code2 className="h-4 w-4" /> Code
        </button>
      </nav>

      {builderView === "code" ? (
        project.html ? (
          <ProjectCodeView
            projectName={project.name}
            code={injectSiteMetadata(injectCmsContent(project.html, project.cms_data), project.site_metadata, project.name)}
          />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Generate your website to view its HTML source.
          </div>
        )
      ) : builderView === "cms" ? (
        <CmsManager key={project.updated_date} value={project.cms_data} onSave={saveCmsData} />
      ) : builderView === "settings" ? (
        <ProjectSettings
          project={project}
          onProjectUpdated={(updatedProject) => {
            setProject(updatedProject);
            setError("");
          }}
        />
      ) : <>
        <nav aria-label="Builder panels" className={`h-11 shrink-0 border-b border-border/70 lg:hidden ${previewMode === "edit" ? "flex" : "hidden"}`}>
          <button
            type="button"
            aria-pressed={activePanel === "chat"}
            onClick={() => setActivePanel("chat")}
            className={`flex flex-1 items-center justify-center gap-2 text-sm ${activePanel === "chat" ? "border-b-2 font-medium" : ""}`}
          >
            <MessageSquare className="h-4 w-4" /> Chat
          </button>
          <button
            type="button"
            aria-pressed={activePanel === "preview"}
            onClick={() => setActivePanel("preview")}
            className={`flex flex-1 items-center justify-center gap-2 text-sm ${activePanel === "preview" ? "border-b-2 font-medium" : ""}`}
          >
            <Monitor className="h-4 w-4" /> Preview
          </button>
        </nav>

        <div className={`grid min-h-0 flex-1 ${previewMode === "preview" ? "grid-cols-1" : selection ? "lg:grid-cols-[minmax(280px,350px)_minmax(0,1fr)_320px]" : "lg:grid-cols-[minmax(320px,390px)_minmax(0,1fr)]"}`}>
          <section className={previewMode === "preview" ? "hidden" : `min-h-0 flex-col border-border/70 lg:flex lg:border-r ${activePanel === "chat" ? "flex" : "hidden"}`}>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-5 [&::-webkit-scrollbar]:w-2[&::-webkit-scrollbar-track]:bg-scrollbar-track [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb">
              {messages.length === 0 ? (
                <div className="my-auto space-y-7 py-8">
                  <div className="space-y-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <h2 className="font-display text-3xl leading-tight">What are we making?</h2>
                    <p className="text-sm leading-relaxed">
                      Describe your site, audience, and style. I’ll build the page and keep refining it with you.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setDraft(suggestion)}
                        className="w-full rounded-xl border border-border/70 px-3.5 py-3 text-left text-sm transition-colors hover:border-brand/40 hover:bg-brand/5"
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
                      <p className="mb-1.5 text-[11px] font-medium">
                        {message.role === "user" ? "You" : "LUNIO Builder"}
                      </p>
                      <div className={`rounded-2xl px-3.5 py-3 text-sm leading-relaxed ${message.role === "user" ? "rounded-br-md bg-black text-white" : "rounded-bl-md bg-muted/70"}`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </article>
                  ))}
                  {generating && (
                    <div className="flex items-center gap-2 text-sm" role="status">
                      <Loader2 className="h-4 w-4 animate-spin" /> Designing your website…
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {error && <p role="alert" className="px-4 pb-2 text-xs leading-relaxed text-destructive">{error}</p>}
            <ProjectIntegrations projectId={projectId} />
            <form onSubmit={handleSubmit} className="shrink-0 border-t border-border/70 p-3 sm:p-4">
              <div className="rounded-2xl border border-border/80 transition-colors focus-within:border-brand/50">
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
                  className="max-h-40 min-h-19 w-full resize-none bg-transparent px-3.5 pt-3 text-sm outline-none  disabled:opacity-60"
                />
                <div className="px-3">
                  <ImageAttachments images={draftImages} onChange={setDraftImages} disabled={generating} compact />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
                  <span className="text-[10px]">Enter to send · Shift + Enter for a new line</span>
                  <Button type="submit" size="icon" aria-label="Send message" disabled={generating || (!draft.trim() && !draftImages.length)} className="h-8 w-8 rounded-full">
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </form>
          </section>

          <section className={`min-h-0 flex-col bg-canvas ${previewMode === "preview" || activePanel === "preview" ? "flex" : "hidden"} ${previewMode === "edit" ? "lg:flex" : ""}`}>
            <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-center gap-2 border-b border-border/70 px-3 py-1.5 sm:px-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div role="group" aria-label="Website mode" className="flex shrink-0 items-center rounded-md border border-border p-0.5">
                  <button
                    type="button"
                    aria-pressed={previewMode === "edit"}
                    onClick={() => setPreviewMode("edit")}
                    className={`flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs transition-colors ${previewMode === "edit" ? "" : ""}`}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    aria-pressed={previewMode === "preview"}
                    onClick={() => {
                      setSelection(null);
                      setPreviewMode("preview");
                    }}
                    className={`flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs transition-colors ${previewMode === "preview" ? "" : ""}`}
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                </div>
                <div role="group" aria-label="Preview breakpoint" className="flex shrink-0 items-center rounded-md border border-border p-0.5">
                  {BREAKPOINTS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      aria-label={`${label} preview`}
                      aria-pressed={breakpoint === id}
                      title={`${label} preview`}
                      onClick={() => setBreakpoint(id)}
                      className={`flex h-8 w-9 items-center justify-center rounded-sm transition-colors ${breakpoint === id ? "" : ""}`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                <span className=" text-right text-[11px] tabular-nums">
                  {BREAKPOINTS.find((item) => item.id === breakpoint)?.width === "100%"
                    ? "Full width"
                    : `${BREAKPOINTS.find((item) => item.id === breakpoint)?.width}px`}
                </span>
              </div>
            </div>
            <div className="relative min-h-0 flex-1 overflow-auto p-3 sm:p-5 [&::-webkit-scrollbar]:w-2[&::-webkit-scrollbar-track]:bg-scrollbar-track [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb">
              {project.html ? (
                <div className="mx-auto h-full" style={{ width: BREAKPOINTS.find((item) => item.id === breakpoint)?.width }}>
                  <iframe
                    ref={previewRef}
                    key={project.updated_date}
                    title={`${project.name} live preview`}
                    srcDoc={injectPreviewInspector(injectSiteMetadata(injectCmsContent(project.html, project.cms_data), project.site_metadata, project.name))}
                    sandbox="allow-scripts allow-forms allow-popups"
                    onLoad={restorePreviewSelection}
                    className={`h-full w-full rounded-lg border border-border bg-white shadow-sm [&::-webkit-scrollbar]:w-2[&::-webkit-scrollbar-track]:bg-scrollbar-track [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb ${deletingElement ? "pointer-events-none" : ""}`}
                  />
                </div>
              ) : (
                <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed border-border px-8 text-center">
                  <div className="max-w-sm space-y-3">
                    <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Monitor className="h-5 w-5" />
                    </span>
                    <p className="font-heading text-sm font-semibold">Your website will appear here</p>
                    <p className="text-sm leading-relaxed">Send a description in the chat to generate the first version.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {selection && previewMode === "edit" && (
            <section className="fixed inset-x-0 bottom-0 top-26 z-40 border-t border-border/70 shadow-2xl sm:left-auto sm:w-80 sm:border-l sm:border-t-0 lg:static lg:z-auto lg:h-full lg:w-auto lg:shadow-none overflow-auto">
              <ElementStylePanel
                key={selection.selector}
                selection={selection}
                saving={savingStyle}
                onChange={handleStyleChange}
                onImageUrlChange={handleImageUrlChange}
                onDelete={() => void handleDeleteElement()}
                deleting={deletingElement}
                deleteError={deleteError}
                onClose={() => {
                  setSelection(null);
                  setDeleteError("");
                }}
              />
            </section>
          )}
        </div>
      </>}
    </main>
  );
}