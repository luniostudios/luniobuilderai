import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { decryptIntegrationKey, encryptIntegrationKey } from "@/lib/integrations";
import { getSupabaseAdmin } from "@/lib/db";
import { getModelOption, isModelId, MODEL_KEY_COLUMNS, type ModelProvider } from "@/lib/ai-models";

type SettingsRow = {
  selected_model: string;
  encrypted_google_key: string | null;
  encrypted_openai_key: string | null;
  encrypted_anthropic_key: string | null;
};

function hasConfiguredKey(row: SettingsRow | null, provider: ModelProvider): boolean {
  const encryptedKey = row?.[MODEL_KEY_COLUMNS[provider]];
  if (!encryptedKey) return false;
  try {
    decryptIntegrationKey(encryptedKey);
    return true;
  } catch {
    throw new Error("A saved model API key cannot be decrypted. Re-enter it in profile settings.");
  }
}

export async function GET() {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("user_model_settings")
    .select("selected_model, encrypted_google_key, encrypted_openai_key, encrypted_anthropic_key")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load model settings." }, { status: 500 });

  const row = data as SettingsRow | null;
  if (row && !isModelId(row.selected_model)) {
    return NextResponse.json({ error: "Your saved model selection is unsupported." }, { status: 500 });
  }

  try {
    return NextResponse.json({
      selectedModel: row?.selected_model ?? "auto",
      configured: {
        google: hasConfiguredKey(row, "google"),
        openai: hasConfiguredKey(row, "openai"),
        anthropic: hasConfiguredKey(row, "anthropic"),
      },
    });
  } catch (reason) {
    return NextResponse.json(
      { error: reason instanceof Error ? reason.message : "Could not read a saved model API key." },
      { status: 500 },
    );
  }
}

async function saveModelSelection(ownerId: string, modelId: unknown) {
  if (!isModelId(modelId)) return NextResponse.json({ error: "Choose a supported model." }, { status: 400 });
  const model = getModelOption(modelId);
  if (!model) return NextResponse.json({ error: "Choose a supported model." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (model.provider) {
    const { data, error } = await supabase
      .from("user_model_settings")
      .select(MODEL_KEY_COLUMNS[model.provider])
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Could not verify the model API key." }, { status: 500 });
    const keySettings = data as {
      encrypted_google_key?: string | null;
      encrypted_openai_key?: string | null;
      encrypted_anthropic_key?: string | null;
    } | null;
    const encryptedKey = keySettings?.[MODEL_KEY_COLUMNS[model.provider]];
    if (!encryptedKey) {
      return NextResponse.json({
        error: `Add your ${model.provider === "google" ? "Google Gemini" : model.provider === "openai" ? "OpenAI" : "Anthropic"} API key in profile settings before selecting this model.`,
        code: "MODEL_API_KEY_REQUIRED",
      }, { status: 400 });
    }
    try {
      decryptIntegrationKey(encryptedKey);
    } catch {
      return NextResponse.json({ error: "Your saved model API key cannot be decrypted. Re-enter it in profile settings." }, { status: 500 });
    }
  }

  const { error } = await supabase.from("user_model_settings").upsert({
    owner_id: ownerId,
    selected_model: model.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "owner_id" });
  if (error) return NextResponse.json({ error: "Could not save your model selection." }, { status: 500 });

  return NextResponse.json({ selectedModel: model.id });
}

export async function PATCH(request: Request) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("model" in body)) {
    return NextResponse.json({ error: "Choose a supported model." }, { status: 400 });
  }
  return saveModelSelection(ownerId, body.model);
}

export async function POST(request: Request) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (body && typeof body === "object" && "action" in body && body.action === "select-model" && "model" in body) {
    return saveModelSelection(ownerId, body.model);
  }
  if (
    !body || typeof body !== "object" ||
    !("provider" in body) || !("key" in body) ||
    (body.provider !== "google" && body.provider !== "openai" && body.provider !== "anthropic") ||
    typeof body.key !== "string"
  ) {
    return NextResponse.json({ error: "Choose a supported provider and enter its API key." }, { status: 400 });
  }

  const key = body.key.trim();
  if (key.length < 8 || key.length > 512 || /\s/.test(key)) {
    return NextResponse.json({ error: "Enter a valid API key without spaces (8-512 characters)." }, { status: 400 });
  }

  let encryptedKey: string;
  try {
    encryptedKey = encryptIntegrationKey(key);
  } catch {
    return NextResponse.json({ error: "Secure key storage is not configured." }, { status: 503 });
  }

  const provider = body.provider;
  const { error } = await getSupabaseAdmin().from("user_model_settings").upsert({
    owner_id: ownerId,
    [MODEL_KEY_COLUMNS[provider]]: encryptedKey,
    updated_at: new Date().toISOString(),
  }, { onConflict: "owner_id" });
  if (error) return NextResponse.json({ error: "Could not save the model API key." }, { status: 500 });

  return NextResponse.json({ provider, configured: true });
}

export async function DELETE(request: Request) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = new URL(request.url).searchParams.get("provider");
  if (provider !== "google" && provider !== "openai" && provider !== "anthropic") {
    return NextResponse.json({ error: "Choose a supported provider." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error: readError } = await supabase
    .from("user_model_settings")
    .select("selected_model")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: "Could not load model settings." }, { status: 500 });

  const selectedModel = getModelOption(data?.selected_model);
  const { error } = await supabase.from("user_model_settings").update({
    [MODEL_KEY_COLUMNS[provider]]: null,
    ...(selectedModel?.provider === provider ? { selected_model: "auto" } : {}),
    updated_at: new Date().toISOString(),
  }).eq("owner_id", ownerId);
  if (error) return NextResponse.json({ error: "Could not remove the model API key." }, { status: 500 });

  return NextResponse.json({ provider, configured: false });
}
