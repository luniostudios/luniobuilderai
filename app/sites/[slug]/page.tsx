import { Suspense } from "react";
import { cache } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSupabaseAdmin } from "@/lib/db";
import { injectCmsContent } from "@/lib/cms";
import { injectSiteMetadata, normalizeSiteMetadata } from "@/lib/site-metadata";

type PublishedSite = {
  name: string;
  html: string;
  cms_data: unknown;
  site_metadata: unknown;
};

const getPublishedSite = cache(async (slug: string): Promise<PublishedSite | null> => {
  await connection();
  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .select("name, html, cms_data, site_metadata")
    .eq("published_slug", slug)
    .maybeSingle();

  if (error || !data?.html) return null;
  return data;
});

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublishedSite(slug);
  if (!site) return {};

  const metadata = normalizeSiteMetadata(site.site_metadata);
  const title = metadata?.title || site.name;
  const description = metadata?.description ?? "";
  const socialImage = metadata?.socialImageUrl || undefined;

  return {
    title,
    description,
    keywords: metadata?.keywords ? metadata.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean) : [],
    authors: metadata?.author ? [{ name: metadata.author }] : undefined,
    icons: metadata?.faviconUrl ? { icon: metadata.faviconUrl } : undefined,
    alternates: { canonical: `https://www.luniobuilder.com/sites/${encodeURIComponent(slug)}` },
    openGraph: {
      title,
      description,
      images: socialImage ? [socialImage] : undefined,
    },
    twitter: {
      card: socialImage ? "summary_large_image" : "summary",
      title,
      description,
      images: socialImage ? [socialImage] : undefined,
    },
  };
}

export async function generateViewport({ params }: PageProps): Promise<Viewport> {
  const { slug } = await params;
  const site = await getPublishedSite(slug);
  const metadata = site ? normalizeSiteMetadata(site.site_metadata) : null;
  return {
    width: "device-width",
    initialScale: 1,
    ...(metadata?.themeColor ? { themeColor: metadata.themeColor } : {}),
  };
}

export default function PublishedSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<main className="fixed inset-0 bg-white" />}>
      <PublishedSite params={params} />
    </Suspense>
  );
}

async function PublishedSite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getPublishedSite(slug);
  if (!site) notFound();

  return (
    <main className="fixed inset-0 bg-white">
      <iframe
        title={site.name}
        srcDoc={injectSiteMetadata(injectCmsContent(site.html, site.cms_data), site.site_metadata, site.name)}
        sandbox="allow-scripts allow-forms allow-popups"
        className="h-full w-full border-0"
      />
    </main>
  );
}