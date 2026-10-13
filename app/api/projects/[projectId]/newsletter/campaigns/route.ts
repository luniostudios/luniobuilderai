import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";
import { decryptIntegrationKey } from "@/lib/integrations";
import { createUnsubscribeToken, escapeHtml } from "@/lib/site-services";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await params;
  const supabase = getSupabaseAdmin();
  const { data: project, error: ownerError } = await supabase.from("projects").select("id")
    .eq("id", projectId).eq("owner_id", ownerId).maybeSingle();
  if (ownerError) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { data, error } = await supabase.from("site_campaigns")
    .select("id, subject, from_email, recipient_count, sent_count, status, created_at, completed_at")
    .eq("project_id", projectId).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Could not load newsletter history." }, { status: 500 });
  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await params;
  if (!process.env.SITE_SESSION_SECRET || process.env.SITE_SESSION_SECRET.length < 32) {
    return NextResponse.json({ error: "Unsubscribe signing is not configured on this server." }, { status: 503 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
  const from = "from" in body && typeof body.from === "string" ? body.from.trim() : "";
  const subject = "subject" in body && typeof body.subject === "string" ? body.subject.trim() : "";
  const text = "text" in body && typeof body.text === "string" ? body.text.trim() : "";
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from) || from.length > 254 || !subject || subject.length > 180 || !text || text.length > 30000) {
    return NextResponse.json({ error: "Enter a valid sender email, subject, and message (up to 30,000 characters)." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: project, error: projectError } = await supabase.from("projects")
    .select("id, published_slug").eq("id", projectId).eq("owner_id", ownerId).maybeSingle();
  if (projectError) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (!project.published_slug) return NextResponse.json({ error: "Publish the site before sending a newsletter." }, { status: 409 });

  const { count, error: countError } = await supabase.from("site_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if (countError) return NextResponse.json({ error: "Could not check campaign limits." }, { status: 500 });
  if ((count ?? 0) >= 3) return NextResponse.json({ error: "This site can send up to three campaigns per hour." }, { status: 429 });

  const { data: integration, error: integrationError } = await supabase.from("project_integrations")
    .select("encrypted_key").eq("project_id", projectId).eq("owner_id", ownerId).eq("provider", "resend").maybeSingle();
  if (integrationError) return NextResponse.json({ error: "Could not load email delivery settings." }, { status: 500 });
  if (!integration) return NextResponse.json({ error: "Connect a Resend API key in project settings before sending." }, { status: 409 });

  let apiKey: string;
  try {
    apiKey = decryptIntegrationKey(integration.encrypted_key);
  } catch {
    return NextResponse.json({ error: "The saved Resend key cannot be read. Reconnect it in project settings." }, { status: 500 });
  }

  const { data: subscribers, count: subscriberCount, error: subscribersError } = await supabase.from("site_subscribers")
    .select("email", { count: "exact" }).eq("project_id", projectId).is("unsubscribed_at", null).order("created_at", { ascending: true }).limit(1000);
  if (subscribersError) return NextResponse.json({ error: "Could not load subscribers." }, { status: 500 });
  if ((subscriberCount ?? 0) > 1000) return NextResponse.json({ error: "Campaigns can include up to 1,000 active subscribers. Export the list and send in smaller segments." }, { status: 409 });
  if (!subscribers?.length) return NextResponse.json({ error: "There are no active subscribers to send to." }, { status: 409 });

  const { data: campaign, error: campaignError } = await supabase.from("site_campaigns").insert({
    project_id: projectId,
    subject,
    from_email: from,
    recipient_count: subscribers.length,
    sent_count: 0,
    status: "sending",
  }).select("id").single();
  if (campaignError || !campaign) return NextResponse.json({ error: "Could not start newsletter campaign." }, { status: 500 });

  const domain = (process.env.SITE_BASE_DOMAIN ?? "").replace(/^https?:\/\//, "").split("/")[0];
  if (!domain) {
    await supabase.from("site_campaigns").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", campaign.id);
    return NextResponse.json({ error: "Published site domains are not configured." }, { status: 503 });
  }
  const siteOrigin = `https://${project.published_slug}.${domain}`;
  const safeText = escapeHtml(text).replaceAll("\r\n", "\n").replaceAll("\n", "<br>");
  const providerIds: string[] = [];
  let sentCount = 0;
  let providerError = false;

  for (let offset = 0; offset < subscribers.length; offset += 100) {
    const batch = subscribers.slice(offset, offset + 100).map((subscriber) => {
      const token = createUnsubscribeToken(projectId, subscriber.email);
      const unsubscribeUrl = `${siteOrigin}/api/sites/${encodeURIComponent(project.published_slug!)}/newsletter?unsubscribe=${encodeURIComponent(token)}`;
      return {
        from,
        to: [subscriber.email],
        subject,
        html: `<div style="font-family:Arial,sans-serif;white-space:normal;line-height:1.6">${safeText}</div><hr><p style="font:12px Arial,sans-serif;color:#666">You received this email because you subscribed to updates from this site. <a href="${unsubscribeUrl}">Unsubscribe</a>.</p>`,
        headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      };
    });

    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `${campaign.id}-${offset / 100}` },
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      providerError = true;
      break;
    }
    if (!response.ok) {
      providerError = true;
      break;
    }
    const result: unknown = await response.json().catch(() => null);
    if (result && typeof result === "object" && "data" in result && Array.isArray(result.data)) {
      providerIds.push(...result.data.flatMap((item: unknown) => item && typeof item === "object" && "id" in item && typeof item.id === "string" ? [item.id] : []));
    }
    sentCount += batch.length;
    const { error: progressError } = await supabase.from("site_campaigns").update({ sent_count: sentCount, provider_ids: providerIds })
      .eq("id", campaign.id);
    if (progressError) {
      providerError = true;
      break;
    }
  }

  const status = providerError ? (sentCount ? "partial" : "failed") : "sent";
  const { error: finishError } = await supabase.from("site_campaigns").update({
    sent_count: sentCount,
    provider_ids: providerIds,
    status,
    completed_at: new Date().toISOString(),
  }).eq("id", campaign.id);
  if (finishError) return NextResponse.json({ error: "The campaign was sent but its status could not be saved." }, { status: 500 });
  if (providerError) return NextResponse.json({ error: `The email provider accepted ${sentCount} of ${subscribers.length} messages. Check Resend before retrying to avoid duplicates.`, campaignId: campaign.id, sentCount, total: subscribers.length }, { status: 502 });
  return NextResponse.json({ ok: true, campaignId: campaign.id, sentCount, total: subscribers.length });
}