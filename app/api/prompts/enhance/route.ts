import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI enhancement is not configured." }, { status: 503 });
  }

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
          systemInstruction: {
            parts: [{
              text: "Improve the user's website-building prompt so an AI website designer can produce a more specific, polished result. Preserve the user's intent, named details, and constraints. Clarify the audience, visual direction, content, sections, and useful interactions where appropriate, without inventing business facts. Return only the improved prompt, with no preamble or quotation marks, and keep it under 8,000 characters.",
            }],
          },
          contents: [{ role: "user", parts: [{ text: body.prompt.trim() }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(30000),
      },
    );
  } catch {
    return NextResponse.json({ error: "Could not reach the AI service. Please try again." }, { status: 502 });
  }

  if (!providerResponse.ok) {
    return NextResponse.json({ error: "AI enhancement failed. Please try again." }, { status: 502 });
  }

  const completion: unknown = await providerResponse.json().catch(() => null);
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
  const enhancedPrompt = parts
    .map((part: unknown) =>
      part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : "",
    )
    .join("")
    .trim();

  if (!enhancedPrompt || enhancedPrompt.length > 8000) {
    return NextResponse.json({ error: "The AI returned an empty or oversized prompt. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ prompt: enhancedPrompt });
}