import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { decryptIntegrationKey } from "@/lib/integrations";
import { getModelOption, isModelId, MODEL_KEY_COLUMNS } from "@/lib/ai-models";
import { getSupabaseAdmin } from "@/lib/db";

function containsCredential(message: string): boolean {
  return [
    /\b(?:api|access)[\s_-]*key\s*[:=]\s*["']?[A-Za-z0-9._-]{12,}/i,
    /\b(?:bearer|token|secret)\s*[:=]\s*["']?[A-Za-z0-9._-]{16,}/i,
    /\b(?:sk-[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16})\b/,
    /^\s*["']?[A-Za-z0-9._~+/=-]{24,512}["']?\s*$/,
    /(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{40,64}(?![A-Za-z0-9_-])/,
  ].some((pattern) => pattern.test(message));
}

export async function POST(request: Request) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (
    !body || typeof body !== "object" || !("prompt" in body) ||
    typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 8000
  ) {
    return NextResponse.json({ error: "Enter a prompt of 1 to 8,000 characters." }, { status: 400 });
  }
  if (containsCredential(body.prompt)) {
    return NextResponse.json({ error: "Remove API keys or other credentials before enhancing this prompt." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: settings, error: settingsError } = await supabase
    .from("user_model_settings")
    .select("selected_model, encrypted_google_key, encrypted_openai_key, encrypted_anthropic_key")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (settingsError) return NextResponse.json({ error: "Could not load your model settings." }, { status: 500 });

  const selectedModelId = settings?.selected_model ?? "auto";
  if (!isModelId(selectedModelId)) {
    return NextResponse.json({ error: "Your selected model is unsupported. Choose a model again in the prompt selector." }, { status: 500 });
  }
  const selectedModel = getModelOption(selectedModelId);
  if (!selectedModel) return NextResponse.json({ error: "Your selected model is unsupported." }, { status: 500 });

  let apiKey: string;
  if (!selectedModel.provider) {
    apiKey = process.env.GEMINI_API_KEY ?? "";
    if (!apiKey) return NextResponse.json({ error: "AI enhancement is not configured." }, { status: 503 });
  } else {
    const encryptedKey = settings?.[MODEL_KEY_COLUMNS[selectedModel.provider]];
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

  let providerResponse: Response;
  const provider = selectedModel.provider ?? "google";
  const systemPrompt = "Improve the user's website-building prompt so an AI website designer can produce a more specific, polished result. Preserve the user's intent, named details, and constraints. Clarify the audience, visual direction, content, sections, and useful interactions where appropriate, without inventing business facts. Return only the improved prompt, with no preamble or quotation marks, and keep it under 8,000 characters.";
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
            contents: [{ role: "user", parts: [{ text: body.prompt.trim() }] }],
            generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
          }),
          signal: AbortSignal.timeout(30000),
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
            { role: "user", content: body.prompt.trim() },
          ],
          max_tokens: 2048,
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(30000),
      });
    } else {
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
          messages: [{ role: "user", content: body.prompt.trim() }],
          max_tokens: 2048,
        }),
        signal: AbortSignal.timeout(30000),
      });
    }
  } catch {
    const providerName = provider === "google" ? "Gemini" : provider === "openai" ? "OpenAI" : "Anthropic";
    return NextResponse.json({ error: `Could not reach the ${providerName} API. Please try again.` }, { status: 502 });
  }

  if (!providerResponse.ok) {
    const providerName = provider === "google" ? "Gemini" : provider === "openai" ? "OpenAI" : "Anthropic";
    return NextResponse.json({ error: `${providerName} prompt enhancement failed. Please check your API key and try again.` }, { status: 502 });
  }

  const completion: unknown = await providerResponse.json().catch(() => null);
  let enhancedPrompt = "";
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
    enhancedPrompt = parts
      .map((part: unknown) => part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : "")
      .join("")
      .trim();
  } else if (provider === "openai") {
    const choices =
      completion && typeof completion === "object" && "choices" in completion && Array.isArray(completion.choices)
        ? completion.choices
        : [];
    const choice = choices[0];
    const message = choice && typeof choice === "object" && "message" in choice ? choice.message : null;
    enhancedPrompt = message && typeof message === "object" && "content" in message && typeof message.content === "string"
      ? message.content.trim() : "";
  } else {
    const content =
      completion && typeof completion === "object" && "content" in completion && Array.isArray(completion.content)
        ? completion.content
        : [];
    enhancedPrompt = content
      .map((part: unknown) => part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : "")
      .join("")
      .trim();
  }

  if (!enhancedPrompt || enhancedPrompt.length > 8000) {
    return NextResponse.json({ error: "The AI returned an empty or oversized prompt. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ prompt: enhancedPrompt });
}