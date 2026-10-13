import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { decryptIntegrationKey, encryptIntegrationKey } from "@/lib/integrations";
import { getSupabaseAdmin } from "@/lib/db";

type RouteContext = { params: Promise<{ projectId: string; provider: string }> };

function isProvider(value: string): value is "unsplash" | "resend" {
  return value === "unsplash" || value === "resend";
}

export async function GET(_request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, provider } = await params;
  if (!isProvider(provider)) return NextResponse.json({ error: "Unsupported integration." }, { status: 404 });

  const supabase = getSupabaseAdmin();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (projectError) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("project_integrations")
    .select("encrypted_key")
    .eq("project_id", projectId)
    .eq("owner_id", ownerId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load integration settings." }, { status: 500 });

  let configured = false;
  if (data?.encrypted_key) {
    try {
      decryptIntegrationKey(data.encrypted_key);
      configured = true;
    } catch {
      return NextResponse.json({ error: "The saved key cannot be decrypted. Re-enter it to continue." }, { status: 500 });
    }
  }
  return NextResponse.json({ provider, configured });
}

export async function POST(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, provider } = await params;
  if (!isProvider(provider)) return NextResponse.json({ error: "Unsupported integration." }, { status: 404 });

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("key" in body) || typeof body.key !== "string") {
    return NextResponse.json({ error: `Enter a valid ${provider === "resend" ? "Resend API" : "Unsplash access"} key.` }, { status: 400 });
  }
  const key = body.key.trim();
  const validKey = provider === "resend"
    ? /^re_[A-Za-z0-9_]{16,}$/.test(key)
    : key.length >= 8 && key.length <= 512 && !/\s/.test(key);
  if (!validKey || key.length > 512) {
    return NextResponse.json({ error: `Enter a valid ${provider === "resend" ? "Resend API" : "Unsplash access"} key.` }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (projectError) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let keyCheck: Response;
  try {
    keyCheck = provider === "resend"
      ? await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      })
      : await fetch("https://api.unsplash.com/search/photos?query=validation&per_page=1", {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: `Could not verify the ${provider === "resend" ? "Resend" : "Unsplash"} key. Try again shortly.` }, { status: 502 });
  }
  if (keyCheck.status === 401 || keyCheck.status === 403) {
    return NextResponse.json({ error: `${provider === "resend" ? "Resend" : "Unsplash"} rejected this key. Check it and try again.` }, { status: 400 });
  }
  if (!keyCheck.ok) {
    return NextResponse.json({ error: `${provider === "resend" ? "Resend" : "Unsplash"} could not verify this key right now.` }, { status: 502 });
  }

  let encryptedKey: string;
  try {
    encryptedKey = encryptIntegrationKey(key);
  } catch {
    return NextResponse.json({ error: "Secure key storage is not configured." }, { status: 503 });
  }

  const { error } = await supabase.from("project_integrations").upsert({
    project_id: projectId,
    owner_id: ownerId,
    provider,
    encrypted_key: encryptedKey,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: "Could not save the integration key." }, { status: 500 });

  return NextResponse.json({ provider, configured: true });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, provider } = await params;
  if (!isProvider(provider)) return NextResponse.json({ error: "Unsupported integration." }, { status: 404 });

  const { error } = await getSupabaseAdmin()
    .from("project_integrations")
    .delete()
    .eq("project_id", projectId)
    .eq("owner_id", ownerId)
    .eq("provider", provider);
  if (error) return NextResponse.json({ error: "Could not remove the integration key." }, { status: 500 });
  return NextResponse.json({ provider, configured: false });
}