import type { Json } from "@/lib/database.types";

export type SiteMetadata = {
  title: string;
  description: string;
  keywords: string;
  author: string;
  faviconUrl: string;
  socialImageUrl: string;
  themeColor: string;
};

export const DEFAULT_SITE_METADATA: SiteMetadata = {
  title: "",
  description: "",
  keywords: "",
  author: "",
  faviconUrl: "",
  socialImageUrl: "",
  themeColor: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validMetadataUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeSiteMetadata(value: unknown): SiteMetadata | null {
  if (!isRecord(value)) return null;

  const limits: Record<keyof SiteMetadata, number> = {
    title: 120,
    description: 320,
    keywords: 500,
    author: 100,
    faviconUrl: 2048,
    socialImageUrl: 2048,
    themeColor: 7,
  };
  const metadata = { ...DEFAULT_SITE_METADATA };

  for (const key of Object.keys(limits) as (keyof SiteMetadata)[]) {
    const rawValue = value[key];
    if (rawValue === undefined) continue;
    if (typeof rawValue !== "string" || rawValue.length > limits[key]) return null;
    metadata[key] = rawValue.trim();
  }

  if (!validMetadataUrl(metadata.faviconUrl) || !validMetadataUrl(metadata.socialImageUrl)) return null;
  if (metadata.themeColor && !/^#[\da-f]{6}$/i.test(metadata.themeColor)) return null;
  return metadata;
}

export function toSiteMetadataJson(metadata: SiteMetadata): Json {
  return metadata as unknown as Json;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

export function injectSiteMetadata(html: string, value: unknown, fallbackTitle: string): string {
  const metadata = normalizeSiteMetadata(value) ?? DEFAULT_SITE_METADATA;
  const title = metadata.title || fallbackTitle;
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    metadata.description && `<meta name="description" content="${escapeHtml(metadata.description)}">`,
    metadata.keywords && `<meta name="keywords" content="${escapeHtml(metadata.keywords)}">`,
    metadata.author && `<meta name="author" content="${escapeHtml(metadata.author)}">`,
    metadata.themeColor && `<meta name="theme-color" content="${escapeHtml(metadata.themeColor)}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    metadata.description && `<meta property="og:description" content="${escapeHtml(metadata.description)}">`,
    metadata.socialImageUrl && `<meta property="og:image" content="${escapeHtml(metadata.socialImageUrl)}">`,
    `<meta name="twitter:card" content="${metadata.socialImageUrl ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    metadata.description && `<meta name="twitter:description" content="${escapeHtml(metadata.description)}">`,
    metadata.socialImageUrl && `<meta name="twitter:image" content="${escapeHtml(metadata.socialImageUrl)}">`,
    metadata.faviconUrl && `<link rel="icon" href="${escapeHtml(metadata.faviconUrl)}">`,
  ].filter(Boolean).join("");

  const managedNames = new Set([
    "description", "keywords", "author", "theme-color", "og:title", "og:description", "og:image",
    "twitter:card", "twitter:title", "twitter:description", "twitter:image",
  ]);
  const cleanHtml = html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, "")
    .replace(/<meta\b[^>]*>/gi, (tag) => {
      const metadataName = /(?:name|property)\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2]?.toLowerCase();
      return metadataName && managedNames.has(metadataName) ? "" : tag;
    })
    .replace(/<link\b[^>]*>/gi, (tag) => /\brel\s*=\s*(["'])[^"']*\bicon\b[^"']*\1/i.test(tag) ? "" : tag);

  if (/<head\b[^>]*>/i.test(cleanHtml)) {
    return cleanHtml.replace(/<head\b[^>]*>/i, (head) => `${head}${tags}`);
  }
  if (/<html\b[^>]*>/i.test(cleanHtml)) {
    return cleanHtml.replace(/<html\b[^>]*>/i, (openHtml) => `${openHtml}<head>${tags}</head>`);
  }
  return `<head>${tags}</head>${cleanHtml}`;
}
