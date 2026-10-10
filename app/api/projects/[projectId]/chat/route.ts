import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";
import { normalizeCmsData, toCmsJson } from "@/lib/cms";
import { parseImageAttachments } from "@/lib/image-attachments";
import { baseprompt } from "./prompt";

type RouteContext = { params: Promise<{ projectId: string }> };
type Project = Database["public"]["Tables"]["projects"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];

type WebsiteUpdate = {
  name: string;
  reply: string;
  html: string;
  cmsData: unknown;
};

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
    "html" in value && typeof value.html === "string" && value.html.trim().length > 0 &&
    "cmsData" in value && normalizeCmsData(value.cmsData) !== null
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI generation is not configured. Add GEMINI_API_KEY to your server environment." },
      { status: 503 }
    );
  }

  const body: unknown = await request.json().catch(() => null);
  if (
    !body || typeof body !== "object" || !("message" in body) ||
    typeof body.message !== "string" || !body.message.trim() || body.message.length > 8000
  ) {
    return NextResponse.json({ error: "Enter a request of 1 to 8,000 characters." }, { status: 400 });
  }
  const attachments = parseImageAttachments("images" in body ? body.images : undefined);
  if (!attachments) {
    return NextResponse.json({ error: "Images must be WebP files, up to 1 MB each and 1.5 MB total." }, { status: 400 });
  }
  const usedImages = attachments.filter((image) => image.intent === "use");
  const attachmentInstructions = attachments.length
    ? `\n\nAttached images and intent:\n${attachments.map((image, index) =>
      `${index + 1}. ${image.name}: ${image.intent === "use" ? `use this exact image on the website with marker LUNIO_UPLOADED_IMAGE_${index}` : "visual reference only"}`
    ).join("\n")}`
    : "";
  const savedMessage = `${body.message.trim()}${attachments.length ? `\n\n[Attached ${attachments.length} image${attachments.length === 1 ? "" : "s"}: ${attachments.map((image) => `${image.name} (${image.intent})`).join(", ")}]` : ""}`;

  const { projectId } = await params;
  const supabase = getSupabaseAdmin();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (projectError) return NextResponse.json({ error: "Could not load this website." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Website not found." }, { status: 404 });
  const currentProject = project as unknown as Project;

  const { data: priorMessages, error: historyError } = await supabase
    .from("messages")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", ownerId)
    .order("created_date", { ascending: false })
    .limit(24);

  if (historyError) return NextResponse.json({ error: "Could not load chat history." }, { status: 500 });

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
  const systemPrompt = [
    baseprompt,
    `Current complete HTML (empty means this is a new website):\n${currentProject.html.slice(0, 120000) || "(empty)"}`,
    `Current CMS data:\n${JSON.stringify(currentProject.cms_data ?? { collections: [] }).slice(0, 60000)}`,
  ].join("\n\n");

  let providerResponse: Response;
  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
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
      }
    );
  } catch {
    return NextResponse.json({ error: "Could not reach the Gemini API. Please try again." }, { status: 502 });
  }

  if (!providerResponse.ok) {
    const providerError: unknown = await providerResponse.json().catch(() => null);
    const errorMessage =
      providerError && typeof providerError === "object" && "error" in providerError &&
      providerError.error && typeof providerError.error === "object" && "message" in providerError.error &&
      typeof providerError.error.message === "string"
        ? providerError.error.message.slice(0, 500)
        : `HTTP ${providerResponse.status}`;
    return NextResponse.json(
      { error: `Gemini API request failed: ${errorMessage}` },
      { status: 502 }
    );
  }

  const completion: unknown = await providerResponse.json().catch(() => null);
  const candidates =
    completion && typeof completion === "object" && "candidates" in completion &&
    Array.isArray(completion.candidates)
      ? completion.candidates
      : [];
  const firstCandidate = candidates[0];
  const candidateContent =
    firstCandidate && typeof firstCandidate === "object" && "content" in firstCandidate
      ? firstCandidate.content
      : null;
  const parts =
    candidateContent && typeof candidateContent === "object" && "parts" in candidateContent &&
    Array.isArray(candidateContent.parts)
      ? candidateContent.parts
      : [];
  const content = parts
    .map((part: unknown) =>
      part && typeof part === "object" && "text" in part && typeof part.text === "string"
        ? part.text
        : ""
    )
    .join("");

  const finishReason =
    firstCandidate && typeof firstCandidate === "object" && "finishReason" in firstCandidate &&
    typeof firstCandidate.finishReason === "string"
      ? firstCandidate.finishReason
      : null;

  if (finishReason === "MAX_TOKENS") {
    return NextResponse.json(
      { error: "The AI response was cut off before the website was complete. Try again with a shorter request." },
      { status: 502 }
    );
  }

  if (!content.trim()) {
    return NextResponse.json({ error: "Gemini returned an empty response. Please try again." }, { status: 502 });
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

  let html = update.html.trim();
  usedImages.forEach((image) => {
    const index = attachments.indexOf(image);
    html = html.replaceAll(`LUNIO_UPLOADED_IMAGE_${index}`, `data:image/webp;base64,${image.data}`);
  });
  if (html.length > 6000000) {
    return NextResponse.json({ error: "The generated website with attached images is too large. Try smaller images." }, { status: 502 });
  }
  const name = update.name.trim().slice(0, 120) || currentProject.name;
  const { data: updatedProject, error: updateError } = await supabase
    .from("projects")
    .update({ name, html, cms_data: toCmsJson(normalizeCmsData(update.cmsData)!), updated_date: new Date().toISOString() })
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .select("*")
    .maybeSingle();

  if (updateError || !updatedProject) {
    return NextResponse.json({ error: "The website was generated but could not be saved." }, { status: 500 });
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