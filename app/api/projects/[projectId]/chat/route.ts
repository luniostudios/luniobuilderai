import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";
import { normalizeCmsData, toCmsJson } from "@/lib/cms";
import { parseImageAttachments } from "@/lib/image-attachments";
import { PROJECT_CLIENT_COLUMNS } from "@/lib/project-fields";
import { baseprompt } from "./prompt";
import { decryptIntegrationKey } from "@/lib/integrations";
import { getModelOption, isModelId, MODEL_KEY_COLUMNS } from "@/lib/ai-models";

type RouteContext = { params: Promise<{ projectId: string }> };
type Project = Database["public"]["Tables"]["projects"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];
type AnthropicBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: "image/webp"; data: string } };
type AnthropicMessage = { role: "user" | "assistant"; content: AnthropicBlock[] };

type WebsiteUpdate = {
  name: string;
  reply: string;
  html: string;
  cmsData: unknown;
};

function containsCredential(message: string): boolean {
  return [
    /\b(?:api|access)[\s_-]*key\s*[:=]\s*["']?[A-Za-z0-9._-]{12,}/i,
    /\b(?:bearer|token|secret)\s*[:=]\s*["']?[A-Za-z0-9._-]{16,}/i,
    /\b(?:sk-[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16})\b/,
    /^\s*["']?[A-Za-z0-9._~+/=-]{24,512}["']?\s*$/,
    /(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{40,64}(?![A-Za-z0-9_-])/,
  ].some((pattern) => pattern.test(message));
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    reply: { type: "string" },
    html: { type: "string" },
    cmsData: {
      type: "object",
      properties: {
        collections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              fields: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    label: { type: "string" },
                    type: { type: "string", enum: ["text", "image", "url", "date"] },
                  },
                  required: ["key", "label", "type"],
                  additionalProperties: false,
                },
              },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    values: { type: "object", additionalProperties: { type: "string" } },
                  },
                  required: ["id", "values"],
                  additionalProperties: false,
                },
              },
            },
            required: ["id", "name", "fields", "items"],
            additionalProperties: false,
          },
        },
      },
      required: ["collections"],
      additionalProperties: false,
    },
  },
  required: ["name", "reply", "html", "cmsData"],
  additionalProperties: false,
};

function isWebsiteUpdate(value: unknown): value is WebsiteUpdate {
  if (!value || typeof value !== "object") return false;
  return (
    "name" in value && typeof value.name === "string" &&
    "reply" in value && typeof value.reply === "string" &&
    "html" in value && typeof value.html === "string" &&
    "cmsData" in value && normalizeCmsData(value.cmsData) !== null
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: modelSettings, error: modelSettingsError } = await supabase
    .from("user_model_settings")
    .select("selected_model, encrypted_google_key, encrypted_openai_key, encrypted_anthropic_key")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (modelSettingsError) return NextResponse.json({ error: "Could not load your model settings." }, { status: 500 });

  const selectedModelId = modelSettings?.selected_model ?? "auto";
  if (!isModelId(selectedModelId)) {
    return NextResponse.json({ error: "Your selected model is unsupported. Choose a model again in the prompt selector." }, { status: 500 });
  }
  const selectedModel = getModelOption(selectedModelId);
  if (!selectedModel) return NextResponse.json({ error: "Your selected model is unsupported." }, { status: 500 });

  let apiKey: string;
  if (!selectedModel.provider) {
    apiKey = process.env.GEMINI_API_KEY ?? "";
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI generation is not configured. Add GEMINI_API_KEY to your server environment." },
        { status: 503 },
      );
    }
  } else {
    const encryptedKey = modelSettings?.[MODEL_KEY_COLUMNS[selectedModel.provider]];
    if (!encryptedKey) {
      return NextResponse.json({
        error: `Add your ${selectedModel.provider === "google" ? "Google Gemini" : selectedModel.provider === "openai" ? "OpenAI" : "Anthropic"} API key in profile settings before using this model.`,
        code: "MODEL_API_KEY_REQUIRED",
      }, { status: 400 });
    }
    try {
      apiKey = decryptIntegrationKey(encryptedKey);
    } catch {
      return NextResponse.json({ error: "Your saved model API key cannot be decrypted. Re-enter it in profile settings." }, { status: 500 });
    }
  }

  const body: unknown = await request.json().catch(() => null);
  if (
    !body || typeof body !== "object" || !("message" in body) ||
    typeof body.message !== "string" || !body.message.trim() || body.message.length > 8000
  ) {
    return NextResponse.json({ error: "Enter a request of 1 to 8,000 characters." }, { status: 400 });
  }
  if (containsCredential(body.message)) {
    return NextResponse.json({
      error: "It looks like this message contains an API key. It was not saved or sent to the AI. Add the key with the secure API integrations control below the chat.",
      code: "SECRET_INPUT_REJECTED",
    }, { status: 400 });
  }
  const attachments = parseImageAttachments("images" in body ? body.images : undefined);
  if (!attachments) {
    return NextResponse.json({ error: "Images must be WebP files, up to 1 MB each and 1.5 MB total." }, { status: 400 });
  }
  const attachmentInstructions = attachments.length
    ? `\n\nAttached images:\n${attachments.map((image, index) =>
      `${index + 1}. ${image.name}: follow the user's intent in their message. If they ask to use or place this image on the website, use the exact image with marker LUNIO_UPLOADED_IMAGE_${index}; otherwise use it only as a visual reference.`
    ).join("\n")}`
    : "";
  const savedMessage = `${body.message.trim()}${attachments.length ? `\n\n[Attached ${attachments.length} image${attachments.length === 1 ? "" : "s"}: ${attachments.map((image) => image.name).join(", ")}]` : ""}`;

  const { projectId } = await params;
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(PROJECT_CLIENT_COLUMNS)
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (projectError) return NextResponse.json({ error: "Could not load this website." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Website not found." }, { status: 404 });
  const currentProject = project as unknown as Project;

  const { data: integrations, error: integrationsError } = await supabase
    .from("project_integrations")
    .select("provider")
    .eq("project_id", projectId)
    .eq("owner_id", ownerId);
  if (integrationsError) return NextResponse.json({ error: "Could not load API integration settings." }, { status: 500 });
  const configuredIntegrations = integrations?.map((integration) => integration.provider) ?? [];

  const { data: priorMessages, error: historyError } = await supabase
    .from("messages")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", ownerId)
    .order("created_date", { ascending: false })
    .limit(24);

  if (historyError) return NextResponse.json({ error: "Could not load chat history." }, { status: 500 });

  if (!selectedModel.provider) {
    const { data: generationAllowed, error: generationLimitError } = await supabase.rpc(
      "reserve_daily_generation",
      { p_owner_id: ownerId },
    );
    if (generationLimitError) {
      return NextResponse.json({ error: "Could not verify your daily generation limit." }, { status: 500 });
    }
    if (!generationAllowed) {
      return NextResponse.json(
        { error: "Free accounts can use up to 5 AI generations per day. Your daily limit resets at midnight UTC." },
        { status: 429 },
      );
    }
  }

  const { data: userMessage, error: insertError } = await supabase
    .from("messages")
    .insert({
      project_id: projectId,
      owner_id: ownerId,
      role: "user",
      content: savedMessage,
    })
    .select("*")
    .single();

  if (insertError) return NextResponse.json({ error: "Could not save your message." }, { status: 500 });

  const history = ((priorMessages ?? []) as Message[]).reverse().map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content.slice(-8000) }],
  }));
  const openAiHistory = ((priorMessages ?? []) as Message[]).reverse().map((message) => ({
    role: message.role,
    content: message.content.slice(-8000),
  }));
  const anthropicHistory = ((priorMessages ?? []) as Message[]).reverse().reduce<AnthropicMessage[]>((history, message) => {
    const lastMessage = history[history.length - 1];
    const textBlock = { type: "text" as const, text: message.content.slice(-8000) };
    if (lastMessage?.role === message.role) {
      lastMessage.content.push(textBlock);
    } else {
      history.push({ role: message.role, content: [textBlock] });
    }
    return history;
  }, []);
  const systemPrompt = [
    baseprompt,
    "Return only one valid JSON object with exactly four fields: name (string), reply (string), html (string), and cmsData (an object with a collections array). Do not wrap it in markdown.",
    `Project id: ${projectId}\nConfigured server-side API integrations: ${configuredIntegrations.join(", ") || "none"}.`,
    `Unsplash search endpoint: /api/projects/${projectId}/integrations/unsplash/search?query=...`,
    `Current complete HTML (empty means this is a new website):\n${currentProject.html.slice(0, 120000) || "(empty)"}`,
    `Current CMS data:\n${JSON.stringify(currentProject.cms_data ?? { collections: [] }).slice(0, 60000)}`,
  ].join("\n\n");

  let providerResponse: Response;
  const provider = selectedModel.provider ?? "google";
  try {
    if (provider === "google") {
      const model = selectedModel.provider ? selectedModel.id : process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
      providerResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
              ...history,
              {
                role: "user",
                parts: [
                  { text: `${body.message.trim()}${attachmentInstructions}` },
                  ...attachments.map((image) => ({ inlineData: { mimeType: image.mimeType, data: image.data } })),
                ],
              },
            ],
            generationConfig: {
              responseFormat: {
                text: { mimeType: "APPLICATION_JSON", schema: RESPONSE_SCHEMA },
              },
              maxOutputTokens: 24000,
            },
          }),
          signal: AbortSignal.timeout(90000),
        },
      );
    } else if (provider === "openai") {
      providerResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel.id,
          messages: [
            { role: "system", content: systemPrompt },
            ...openAiHistory,
            {
              role: "user",
              content: [
                { type: "text", text: `${body.message.trim()}${attachmentInstructions}` },
                ...attachments.map((image) => ({
                  type: "image_url",
                  image_url: { url: `data:${image.mimeType};base64,${image.data}` },
                })),
              ],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 24000,
        }),
        signal: AbortSignal.timeout(90000),
      });
    } else {
      const userContent: AnthropicBlock[] = [
        { type: "text", text: `${body.message.trim()}${attachmentInstructions}` },
        ...attachments.map((image) => ({
          type: "image" as const,
          source: { type: "base64" as const, media_type: image.mimeType, data: image.data },
        })),
      ];
      const anthropicMessages = [...anthropicHistory];
      const lastMessage = anthropicMessages[anthropicMessages.length - 1];
      if (lastMessage?.role === "user") {
        lastMessage.content.push(...userContent);
      } else {
        anthropicMessages.push({ role: "user", content: userContent });
      }
      providerResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel.id,
          system: systemPrompt,
          messages: anthropicMessages,
          max_tokens: 24000,
        }),
        signal: AbortSignal.timeout(90000),
      });
    }
  } catch {
    const providerName = provider === "google" ? "Gemini" : provider === "openai" ? "OpenAI" : "Anthropic";
    return NextResponse.json({ error: `Could not reach the ${providerName} API. Please try again.` }, { status: 502 });
  }

  if (!providerResponse.ok) {
    const providerError: unknown = await providerResponse.json().catch(() => null);
    const errorObject =
      providerError && typeof providerError === "object" && "error" in providerError &&
      providerError.error && typeof providerError.error === "object"
        ? providerError.error
        : providerError;
    const errorMessage = errorObject && typeof errorObject === "object" && "message" in errorObject &&
      typeof errorObject.message === "string" ? errorObject.message.slice(0, 500) : `HTTP ${providerResponse.status}`;
    const providerName = provider === "google" ? "Gemini" : provider === "openai" ? "OpenAI" : "Anthropic";
    return NextResponse.json(
      { error: `${providerName} API request failed: ${errorMessage}` },
      { status: 502 }
    );
  }

  const completion: unknown = await providerResponse.json().catch(() => null);
  let content = "";
  let finishReason: string | null = null;
  if (provider === "google") {
    const candidates =
      completion && typeof completion === "object" && "candidates" in completion && Array.isArray(completion.candidates)
        ? completion.candidates
        : [];
    const firstCandidate = candidates[0];
    const candidateContent =
      firstCandidate && typeof firstCandidate === "object" && "content" in firstCandidate
        ? firstCandidate.content
        : null;
    const parts =
      candidateContent && typeof candidateContent === "object" && "parts" in candidateContent && Array.isArray(candidateContent.parts)
        ? candidateContent.parts
        : [];
    content = parts
      .map((part: unknown) => part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : "")
      .join("");
    finishReason =
      firstCandidate && typeof firstCandidate === "object" && "finishReason" in firstCandidate &&
      typeof firstCandidate.finishReason === "string" ? firstCandidate.finishReason : null;
  } else if (provider === "openai") {
    const choices =
      completion && typeof completion === "object" && "choices" in completion && Array.isArray(completion.choices)
      ? completion.choices
      : [];
    const choice = choices[0];
    const message = choice && typeof choice === "object" && "message" in choice ? choice.message : null;
    content = message && typeof message === "object" && "content" in message && typeof message.content === "string"
      ? message.content : "";
    finishReason =
      choice && typeof choice === "object" && "finish_reason" in choice && typeof choice.finish_reason === "string"
      ? choice.finish_reason : null;
  } else {
    const responseContent =
      completion && typeof completion === "object" && "content" in completion && Array.isArray(completion.content)
      ? completion.content
      : [];
    content = responseContent
      .map((part: unknown) => part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : "")
      .join("");
    finishReason =
      completion && typeof completion === "object" && "stop_reason" in completion &&
      typeof completion.stop_reason === "string" ? completion.stop_reason : null;
  }

  if (finishReason === "MAX_TOKENS" || finishReason === "length" || finishReason === "max_tokens") {
    return NextResponse.json(
      { error: "The AI response was cut off before the website was complete. Try again with a shorter request." },
      { status: 502 }
    );
  }

  if (!content.trim()) {
    const providerName = provider === "google" ? "Gemini" : provider === "openai" ? "OpenAI" : "Anthropic";
    return NextResponse.json({ error: `${providerName} returned an empty response. Please try again.` }, { status: 502 });
  }

  let update: unknown;
  try {
    const jsonContent = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    update = JSON.parse(jsonContent);
  } catch {
    return NextResponse.json({ error: "The AI returned an invalid website update. Please try again." }, { status: 502 });
  }

  if (!isWebsiteUpdate(update) || update.html.length > 1000000) {
    return NextResponse.json({ error: "The AI returned an invalid or oversized website." }, { status: 502 });
  }

  let updatedProject: Project = currentProject;
  if (update.html.trim()) {
    let html = update.html.trim();
    attachments.forEach((image, index) => {
      html = html.replaceAll(`LUNIO_UPLOADED_IMAGE_${index}`, `data:image/webp;base64,${image.data}`);
    });
    if (html.length > 6000000) {
      return NextResponse.json({ error: "The generated website with attached images is too large. Try smaller images." }, { status: 502 });
    }
    const name = update.name.trim().slice(0, 120) || currentProject.name;
    const { data, error: updateError } = await supabase
      .from("projects")
      .update({ name, html, cms_data: toCmsJson(normalizeCmsData(update.cmsData)!), updated_date: new Date().toISOString() })
      .eq("id", projectId)
      .eq("owner_id", ownerId)
      .select(PROJECT_CLIENT_COLUMNS)
      .maybeSingle();

    if (updateError || !data) {
      return NextResponse.json({ error: "The website was generated but could not be saved." }, { status: 500 });
    }
    updatedProject = data as Project;
  }

  const { data: assistantMessage, error: assistantInsertError } = await supabase
    .from("messages")
    .insert({
      project_id: projectId,
      owner_id: ownerId,
      role: "assistant",
      content: update.reply.trim().slice(0, 4000) || "Your website is ready.",
    })
    .select("*")
    .single();

  if (assistantInsertError) {
    return NextResponse.json({ error: "The website was saved, but the chat reply could not be saved." }, { status: 500 });
  }

  return NextResponse.json({ userMessage, assistantMessage, project: updatedProject });
}