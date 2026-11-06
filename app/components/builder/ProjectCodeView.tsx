"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Check, Clipboard, Download } from "lucide-react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { createViteProjectFiles, type ProjectSourceFile } from "@/lib/project-files";

export default function ProjectCodeView({
  projectName,
  code,
  sourceFiles,
  cmsData,
}: {
  projectName: string;
  code: string;
  sourceFiles: ProjectSourceFile[];
  cmsData: unknown;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [selectedPath, setSelectedPath] = useState(sourceFiles[0]?.path ?? "index.html");
  const files = sourceFiles.length ? createViteProjectFiles(sourceFiles, projectName, cmsData) : [{ path: "index.html", content: code }];
  const activeFile = files.find((file) => file.path === selectedPath) ?? files[0];

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setError("");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access is unavailable in this browser.");
    }
  }

  async function downloadCode() {
    const fileName = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "website";
    try {
      const archive = new JSZip();
      files.forEach((file) => archive.file(file.path, file.content));
      const blob = sourceFiles.length
        ? await archive.generateAsync({ type: "blob", compression: "DEFLATE" })
        : new Blob([code], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = sourceFiles.length ? `${fileName}.zip` : `${fileName}.html`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setError("Could not create the project download.");
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-labelledby="project-code-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-3 sm:px-8">
        <div>
          <h2 id="project-code-title" className="text-sm font-semibold">Project source</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {sourceFiles.length ? `React + Vite · ${files.length} files` : `HTML · ${(new Blob([code]).size / 1024).toFixed(1)} KB`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
          <Button type="button" size="sm" onClick={() => void copyCode()} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button type="button" size="sm" onClick={() => void downloadCode()} className="gap-2">
            <Download className="h-4 w-4" /> {sourceFiles.length ? "Download project" : "Download HTML"}
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <nav className="w-48 shrink-0 overflow-auto border-r border-border/70 bg-muted/20 p-2" aria-label="Project files">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Files</p>
          {files.map((file) => (
            <button
              key={file.path}
              type="button"
              aria-current={file.path === activeFile.path ? "page" : undefined}
              onClick={() => setSelectedPath(file.path)}
              className={`block w-full truncate rounded-sm px-2 py-1.5 text-left font-mono text-xs ${file.path === activeFile.path ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
              title={file.path}
            >
              {file.path}
            </button>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col" aria-label={`Source file ${activeFile.path}`}>
          <div className="border-b border-border/70 px-4 py-2 font-mono text-xs text-muted-foreground">{activeFile.path}</div>
          <div className="min-h-0 flex-1">
            <Editor
              height="100%"
              language={activeFile.path.endsWith(".css") ? "css" : activeFile.path.endsWith(".json") ? "json" : activeFile.path.endsWith(".html") ? "html" : /\.tsx?$/.test(activeFile.path) ? "typescript" : "javascript"}
              theme="light"
              value={activeFile.content}
              options={{
                ariaLabel: `Source code for ${activeFile.path}`,
                automaticLayout: true,
                fontSize: 13,
                minimap: { enabled: false },
                padding: { top: 16, bottom: 16 },
                readOnly: true,
                scrollBeyondLastLine: false,
                wordWrap: "off",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
