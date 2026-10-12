import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/db";
import { injectCmsContent } from "@/lib/cms";
import { injectSiteMetadata } from "@/lib/site-metadata";
import { renderProjectScreenshot } from "@/lib/render-project-screenshot";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { projectId } = await params;
  const url = new URL(request.url);
  const publicPreview = url.searchParams.get("public") === "1";
  const session = publicPreview ? null : await auth();
  if (!publicPreview && !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project, error } = await getSupabaseAdmin()
    .from("projects")
    .select("owner_id, name, html, cms_data, site_metadata, published_slug")
    .eq("id", projectId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project || (publicPreview ? !project.published_slug : project.owner_id !== session?.user?.id)) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (!project.html) return new Response(null, { status: 204 });

  try {
    const html = injectSiteMetadata(
      injectCmsContent(project.html, project.cms_data),
      project.site_metadata,
      project.name,
    );
    const screenshot = await renderProjectScreenshot(html);
    const imageBytes = new Uint8Array(screenshot.byteLength);
    imageBytes.set(screenshot);
    return new Response(imageBytes.buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": publicPreview ? "public, max-age=60, s-maxage=300" : "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not render this website screenshot." }, { status: 503 });
  }
}