import { NextResponse } from "next/server";
import { allowPublicSubmission, getPublishedProject, getPublishedSiteOrigin } from "@/lib/site-services";
import { normalizeCmsData, type CmsCollection } from "@/lib/cms";
import { getSupabaseAdmin } from "@/lib/db";

type RouteContext = { params: Promise<{ slug: string; collection: string }> };

async function loadCollection(request: Request, slug: string, collectionRef: string) {
  if (!getPublishedSiteOrigin(request, slug)) {
    return { response: NextResponse.json({ error: "Use this CMS from the site's dedicated domain." }, { status: 403 }) };
  }

  const { data: project, error } = await getPublishedProject(slug);
  if (error) return { response: NextResponse.json({ error: "Could not load this site." }, { status: 500 }) };
  if (!project) return { response: NextResponse.json({ error: "This site is not published." }, { status: 404 }) };

  const cmsData = normalizeCmsData(project.cms_data);
  const collection = cmsData?.collections.find((item) => item.id === collectionRef || item.name === collectionRef);
  if (!collection) return { response: NextResponse.json({ error: "CMS collection not found." }, { status: 404 }) };

  return { project, collection };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeEntryValues(value: unknown, collection: CmsCollection): Record<string, string> | null {
  if (!isRecord(value) || Object.keys(value).some((key) => !collection.fields.some((field) => field.key === key))) return null;

  const values: Record<string, string> = {};
  let totalLength = 0;
  for (const field of collection.fields) {
    const fieldValue = value[field.key] ?? "";
    if (typeof fieldValue !== "string" || fieldValue.length > 10000) return null;
    totalLength += fieldValue.length;
    if (totalLength > 20000) return null;
    values[field.key] = fieldValue;
  }
  return collection.fields.length > 0 ? values : null;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { slug, collection: collectionRef } = await params;
  const loaded = await loadCollection(request, slug, collectionRef);
  if ("response" in loaded) return loaded.response;

  const limitValue = Number(new URL(request.url).searchParams.get("limit")) || 100;
  const limit = Math.max(1, Math.min(200, Math.floor(limitValue)));
  const { data, error } = await getSupabaseAdmin()
    .from("site_cms_entries")
    .select("id, record_data, created_at")
    .eq("project_id", loaded.project.id)
    .eq("collection_id", loaded.collection.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: "Could not load CMS entries." }, { status: 500 });

  const entries = (data ?? []).map((entry) => ({
    id: entry.id,
    values: normalizeEntryValues(entry.record_data, loaded.collection) ?? {},
    createdAt: entry.created_at,
  }));
  return NextResponse.json({
    collection: { id: loaded.collection.id, name: loaded.collection.name, fields: loaded.collection.fields },
    items: [...loaded.collection.items, ...entries],
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { slug, collection: collectionRef } = await params;
  const loaded = await loadCollection(request, slug, collectionRef);
  if ("response" in loaded) return loaded.response;

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 32768) {
    return NextResponse.json({ error: "Form submission is too large." }, { status: 413 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Send form data as JSON." }, { status: 415 });
  }
  const bodyText = await request.text();
  if (bodyText.length > 32768) return NextResponse.json({ error: "Form submission is too large." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(bodyText || "null");
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }
  if (!isRecord(body)) return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  const values = normalizeEntryValues(body.values, loaded.collection);
  if (!values) return NextResponse.json({ error: "Values must match the fields in this CMS collection." }, { status: 400 });
  if (!process.env.SITE_SESSION_SECRET || process.env.SITE_SESSION_SECRET.length < 32) {
    return NextResponse.json({ error: "CMS submissions are not configured on this site." }, { status: 503 });
  }
  if (!await allowPublicSubmission(loaded.project.id, request)) {
    return NextResponse.json({ error: "Too many submissions. Please try again in a minute." }, { status: 429 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("site_cms_entries")
    .insert({ project_id: loaded.project.id, collection_id: loaded.collection.id, record_data: values })
    .select("id, record_data, created_at")
    .single();
  if (error) return NextResponse.json({ error: "Could not save your submission." }, { status: 500 });

  return NextResponse.json({
    ok: true,
    item: { id: data.id, values: normalizeEntryValues(data.record_data, loaded.collection) ?? {}, createdAt: data.created_at },
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}