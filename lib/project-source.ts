import "server-only";
import { posix } from "node:path";
import { build } from "esbuild";
import type { ProjectSourceFile } from "@/lib/project-files";

const SOURCE_EXTENSIONS = ["", ".jsx", ".js", ".tsx", ".ts", ".css", ".json"];

function htmlSafeScript(value: string): string {
  return value.replace(/<\/script/gi, "<\\/script");
}

export async function buildProjectPreview(files: ProjectSourceFile[]): Promise<string> {
  const sourceByPath = new Map(files.map((file) => [file.path, file.content]));
  const result = await build({
    absWorkingDir: process.cwd(),
    entryPoints: ["src/main.jsx"],
    outdir: "out",
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    target: ["es2020"],
    jsx: "automatic",
    minify: true,
    define: { "process.env.NODE_ENV": '"production"' },
    legalComments: "none",
    plugins: [{
      name: "lunio-project-files",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^src\/main\.jsx$/ }, () => ({ path: "src/main.jsx", namespace: "lunio-project" }));
        buildContext.onResolve({ filter: /^\.\.?\// }, (args) => {
          if (args.namespace !== "lunio-project") return;
          const target = posix.normalize(posix.join(posix.dirname(args.importer), args.path));
          if (!target.startsWith("src/") || target.split("/").some((part) => part === "..")) {
            return { errors: [{ text: "Project imports must stay inside src/." }] };
          }
          const candidates = SOURCE_EXTENSIONS.map((extension) => `${target}${extension}`);
          for (const extension of SOURCE_EXTENSIONS.slice(1)) candidates.push(`${target}/index${extension}`);
          const match = candidates.find((candidate) => sourceByPath.has(candidate));
          return match
            ? { path: match, namespace: "lunio-project" }
            : { errors: [{ text: `Could not resolve project import: ${args.path}` }] };
        });
        buildContext.onLoad({ filter: /.*/, namespace: "lunio-project" }, (args) => {
          const content = sourceByPath.get(args.path);
          if (content === undefined) return { errors: [{ text: `Project file not found: ${args.path}` }] };
          const extension = posix.extname(args.path);
          const loader = extension === ".jsx" ? "jsx" : extension === ".tsx" ? "tsx" : extension === ".ts" ? "ts" : extension === ".css" ? "css" : extension === ".json" ? "json" : "js";
          return { contents: content, loader, resolveDir: process.cwd() };
        });
      },
    }],
  });

  const script = result.outputFiles.find((file) => file.path.endsWith(".js"))?.text;
  const styles = result.outputFiles.find((file) => file.path.endsWith(".css"))?.text ?? "";
  if (!script) throw new Error("Could not compile the React entry point.");
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles.replaceAll("</style", "<\\/style")}</style></head><body><div id="root"></div><script type="module">${htmlSafeScript(script)}</script></body></html>`;
}