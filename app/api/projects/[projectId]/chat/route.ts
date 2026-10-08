import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";
import { baseprompt } from "./prompt";

type RouteContext = { params: Promise<{ projectId: string }> };
type Project = Database["public"]["Tables"]["projects"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];

type WebsiteUpdate = {
  name: string;
  reply: string;
  html: string;
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    reply: { type: "string" },
    html: { type: "string" },
  },
  required: ["name", "reply", "html"],
  additionalProperties: false,
};

function isWebsiteUpdate(value: unknown): value is WebsiteUpdate {
  if (!value || typeof value !== "object") return false;
  return (
    "name" in value && typeof value.name === "string" &&
    "reply" in value && typeof value.reply === "string" &&
    "html" in value && typeof value.html === "string" && value.html.trim().length > 0
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI generation is not configured. Add OPENROUTER_API_KEY to your server environment." },
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
      content: body.message.trim(),
    })
    .select("*")
    .single();

  if (insertError) return NextResponse.json({ error: "Could not save your message." }, { status: 500 });

  const history = ((priorMessages ?? []) as Message[]).reverse().map((message) => ({
    role: message.role,
    content: message.content.slice(-8000),
  }));
  const systemPrompt = [
    baseprompt,
    `Current complete HTML (empty means this is a new website):\n${currentProject.html.slice(0, 120000) || "(empty)"}`,
  ].join("\n\n");

  let providerResponse: Response;
  try {
    providerResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Foundry Website Builder",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: body.message.trim() },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "website_update", strict: true, schema: RESPONSE_SCHEMA },
        },
        max_completion_tokens: 12000,
      }),
      signal: AbortSignal.timeout(90000),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the AI provider. Please try again." }, { status: 502 });
  }

  if (!providerResponse.ok) {
    return NextResponse.json(
      { error: "The AI provider rejected the request. Check your API key, model, and account limits." },
      { status: 502 }
    );
  }

  const completion: unknown = await providerResponse.json().catch(() => null);
  const content =
    completion && typeof completion === "object" && "choices" in completion &&
    Array.isArray(completion.choices) && completion.choices[0] &&
    typeof completion.choices[0] === "object" && "message" in completion.choices[0] &&
    completion.choices[0].message && typeof completion.choices[0].message === "object" &&
    "content" in completion.choices[0].message
      ? completion.choices[0].message.content
      : null;

  if (typeof content !== "string") {
    return NextResponse.json({ error: "The AI returned an empty response. Please try again." }, { status: 502 });
  }

  let update: unknown;
  try {
    update = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: "The AI returned an invalid website update. Please try again." }, { status: 502 });
  }

  if (!isWebsiteUpdate(update) || update.html.length > 1000000) {
    return NextResponse.json({ error: "The AI returned an invalid or oversized website." }, { status: 502 });
  }

  const html = update.html.trim();
  const name = update.name.trim().slice(0, 120) || currentProject.name;
  const { data: updatedProject, error: updateError } = await supabase
    .from("projects")
    .update({ name, html, updated_date: new Date().toISOString() })
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