import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";
import { injectCmsContent } from "@/lib/cms";

type RouteContext = { params: Promise<{ projectId: string }> };

type VercelApiError = {
  error?: { code?: string; message?: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

async function vercelError(response: Response, token: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const error = isRecord(body) && isRecord(body.error) ? body.error as VercelApiError["error"] : null;
  const message = error?.message?.replaceAll(token, "[redacted]").slice(0, 300);
  return message || `Vercel returned HTTP ${response.status}. Check your token and team access.`;
}

function projectName(name: string, projectId: string): string {
  const safeName = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42)
    .replace(/-$/g, "") || "website";

  return `lunio-${safeName}-${projectId.replaceAll("-", "").slice(0, 8)}`;
}

export async function POST(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (
    !isRecord(body) ||
    typeof body.token !== "string" || !body.token.trim() || body.token.length > 512 ||
    ("teamId" in body && (typeof body.teamId !== "string" || body.teamId.length > 128))
  ) {
    return NextResponse.json({ error: "Enter a valid Vercel access token and optional team ID." }, { status: 400 });
  }

  const token = body.token.trim();
  const teamId = typeof body.teamId === "string" ? body.teamId.trim() : "";
  const teamQuery = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const { projectId } = await params;
  const { data: project, error: loadError } = await getSupabaseAdmin()
    .from("projects")
    .select("id, name, html, cms_data")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (loadError) return NextResponse.json({ error: "Could not load this project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (!project.html.trim()) return NextResponse.json({ error: "Add website content before deploying." }, { status: 400 });

  const name = projectName(project.name, project.id);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  let vercelProjectId: string | null = null;
  try {
    const existingProjectResponse = await fetch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(name)}${teamQuery}`,
      { headers, signal: AbortSignal.timeout(20000) }
    );
    if (existingProjectResponse.ok) {
      const existingProject: unknown = await existingProjectResponse.json();
      if (isRecord(existingProject) && typeof existingProject.id === "string") {
        vercelProjectId = existingProject.id;
      }
      if (!vercelProjectId) {
        return NextResponse.json({ error: "Vercel returned an invalid project response." }, { status: 502 });
      }
    } else if (existingProjectResponse.status !== 404) {
      return NextResponse.json(
        { error: `Could not access Vercel: ${await vercelError(existingProjectResponse, token)}` },
        { status: 502 }
      );
    }

    if (!vercelProjectId) {
      const createProjectResponse = await fetch(`https://api.vercel.com/v11/projects${teamQuery}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          framework: null,
          buildCommand: null,
          installCommand: null,
          outputDirectory: null,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!createProjectResponse.ok) {
        return NextResponse.json(
          { error: `Could not create a Vercel project: ${await vercelError(createProjectResponse, token)}` },
          { status: 502 }
        );
      }

      const createdProject: unknown = await createProjectResponse.json();
      if (!isRecord(createdProject) || typeof createdProject.id !== "string") {
        return NextResponse.json({ error: "Vercel returned an invalid project response." }, { status: 502 });
      }
      vercelProjectId = createdProject.id;
    }

    const html = injectCmsContent(project.html, project.cms_data);
    const deploymentResponse = await fetch(`https://api.vercel.com/v13/deployments${teamQuery}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name,
        project: vercelProjectId,
        target: "production",
        projectSettings: {
          framework: null,
          buildCommand: null,
          installCommand: null,
          outputDirectory: null,
        },
        files: [{ file: "index.html", data: html, encoding: "utf-8" }],
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!deploymentResponse.ok) {
      return NextResponse.json(
        { error: `Vercel deployment failed: ${await vercelError(deploymentResponse, token)}` },
        { status: 502 }
      );
    }

    const deployment: unknown = await deploymentResponse.json();
    if (!isRecord(deployment) || typeof deployment.url !== "string") {
      return NextResponse.json({ error: "Vercel accepted the deployment but returned no deployment URL." }, { status: 502 });
    }

    return NextResponse.json({ url: `https://${deployment.url}`, projectName: name });
  } catch {
    return NextResponse.json(
      { error: "Could not reach Vercel. Check your connection and try again." },
      { status: 502 }
    );
  }
}
