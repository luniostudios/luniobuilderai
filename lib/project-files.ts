export type ProjectSourceFile = { path: string; content: string };

const SOURCE_PATH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*\.(?:html|css|js)$/;

export function normalizeProjectSourceFiles(value: unknown): ProjectSourceFile[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) return null;

  const files: ProjectSourceFile[] = [];
  const paths = new Set<string>();
  let totalSize = 0;
  for (const item of value) {
    if (!item || typeof item !== "object" || !("path" in item) || typeof item.path !== "string" || !("content" in item) || typeof item.content !== "string") return null;
    const path: string = item.path;
    const content: string = item.content;
    const segments = path.split("/");
    if (!SOURCE_PATH_PATTERN.test(path) || segments.some((segment) => !segment || segment === "." || segment === "..") || paths.has(path)) return null;
    if (content.length > 150000) return null;
    totalSize += content.length;
    if (totalSize > 700000) return null;
    paths.add(path);
    files.push({ path, content });
  }

  return paths.has("index.html") ? files : null;
}

