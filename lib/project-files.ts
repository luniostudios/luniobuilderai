export type ProjectSourceFile = { path: string; content: string };

const SOURCE_PATH_PATTERN = /^src\/[A-Za-z0-9][A-Za-z0-9._/-]*\.(?:jsx|js|tsx|ts|css|json)$/;

export function normalizeProjectSourceFiles(value: unknown): ProjectSourceFile[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 30) return null;

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

  return paths.has("src/main.jsx") && paths.has("src/App.jsx") ? files : null;
}

function packageJson(name: string) {
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "lunio-site";
  return JSON.stringify({
    name: safeName,
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
    dependencies: { "lucide-react": "^0.468.0", react: "^19.0.0", "react-dom": "^19.0.0" },
    devDependencies: { "@vitejs/plugin-react": "^4.3.4", vite: "^6.0.0" },
  }, null, 2);
}

export function createViteProjectFiles(files: ProjectSourceFile[], projectName: string, cmsData: unknown = { collections: [] }): ProjectSourceFile[] {
  const cmsPayload = JSON.stringify(cmsData ?? { collections: [] }).replace(/</g, "\\u003c");
  return [
    { path: "index.html", content: `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${projectName.replace(/[<>"&]/g, "")}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="application/json" id="lunio-cms-data">${cmsPayload}</script>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n` },
    { path: "package.json", content: `${packageJson(projectName)}\n` },
    { path: "vite.config.js", content: `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({ plugins: [react()] });\n` },
    ...files,
  ];
}