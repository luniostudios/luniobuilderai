import "server-only";
import type { ProjectSourceFile } from "@/lib/project-files";

function inlineIntoIndex(indexHtml: string, files: ProjectSourceFile[]): string {
  const byPath = new Map(files.map((file) => [file.path, file.content]));
  return indexHtml
    .replace(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi, (tag, href: string) => {
      if (!/\brel=["']stylesheet["']/i.test(tag)) return tag;
      const css = byPath.get(href.replace(/^\.?\//, ""));
      return css === undefined ? tag : `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`;
    })
    .replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi, (tag, src: string) => {
      const js = byPath.get(src.replace(/^\.?\//, ""));
      return js === undefined ? tag : `<script>${js.replace(/<\/script/gi, "<\\/script")}</script>`;
    });
}

export async function buildProjectPreview(files: ProjectSourceFile[]): Promise<string> {
  const index = files.find((file) => file.path === "index.html");
  if (!index) throw new Error("The website needs an index.html file.");
  return inlineIntoIndex(index.content, files);
}