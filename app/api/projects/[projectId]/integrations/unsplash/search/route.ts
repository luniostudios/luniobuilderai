import { NextResponse } from "next/server";
import { decryptIntegrationKey } from "@/lib/integrations";
import { getSupabaseAdmin } from "@/lib/db";

type RouteContext = { params: Promise<{ projectId: string }> };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=60, s-maxage=60",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

export async function GET(request: Request, { params }: RouteContext) {
  const { projectId } = await params;
  const query = new URL(request.url).searchParams.get("query")?.trim() ?? "";
  if (!query || query.length > 120) return json({ error: "Search terms must be 1 to 120 characters." }, 400);

  const supabase = getSupabaseAdmin();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) return json({ error: "Could not load this website." }, 500);
  if (!project) return json({ error: "Website not found." }, 404);

  const { data: integration, error: integrationError } = await supabase
    .from("project_integrations")
    .select("encrypted_key")
    .eq("project_id", projectId)
    .eq("provider", "unsplash")
    .maybeSingle();
  if (integrationError) return json({ error: "Could not load the Unsplash integration." }, 500);
  if (!integration) return json({ error: "The Unsplash integration needs an access key." }, 409);

  let key: string;
  try {
    key = decryptIntegrationKey(integration.encrypted_key);
  } catch {
    return json({ error: "The saved Unsplash key is unavailable. Ask the site owner to reconnect it." }, 500);
  }

  let response: Response;
  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "12");
    response = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
  } catch {
    return json({ error: "Could not reach Unsplash. Try again shortly." }, 502);
  }

  if (!response.ok) return json({ error: "Unsplash rejected the request. Check the saved access key." }, 502);

  const result: unknown = await response.json().catch(() => null);
  if (!result || typeof result !== "object" || !("results" in result) || !Array.isArray(result.results)) {
    return json({ error: "Unsplash returned an unexpected response." }, 502);
  }

  const photos = result.results.flatMap((photo: unknown) => {
    if (!photo || typeof photo !== "object" || !("id" in photo) || typeof photo.id !== "string") return [];
    const urls = "urls" in photo && photo.urls && typeof photo.urls === "object" ? photo.urls : null;
    const user = "user" in photo && photo.user && typeof photo.user === "object" ? photo.user : null;
    const links = user && "links" in user && user.links && typeof user.links === "object" ? user.links : null;
    return [{
      id: photo.id,
      description: "description" in photo && typeof photo.description === "string" ? photo.description : "",
      alt_description: "alt_description" in photo && typeof photo.alt_description === "string" ? photo.alt_description : "",
      urls: {
        small: urls && "small" in urls && typeof urls.small === "string" ? urls.small : "",
        regular: urls && "regular" in urls && typeof urls.regular === "string" ? urls.regular : "",
      },
      user: {
        name: user && "name" in user && typeof user.name === "string" ? user.name : "Unsplash contributor",
        link: links && "html" in links && typeof links.html === "string" ? links.html : "https://unsplash.com",
      },
    }];
  });

  return json({ photos });
}