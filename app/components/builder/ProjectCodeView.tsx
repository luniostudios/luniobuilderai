"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Check, Clipboard, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProjectCodeView({
  projectName,
  code,
}: {
  projectName: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setError("");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access is unavailable in this browser.");
    }
  }

  function downloadCode() {
    const fileName = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "website";
    const file = new Blob([code], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.html`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-labelledby="project-code-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-3 sm:px-8">
        <div>
          <h2 id="project-code-title" className="text-sm font-semibold">Website source</h2>
          <p className="mt-1 text-xs text-muted-foreground">HTML · {(new Blob([code]).size / 1024).toFixed(1)} KB</p>
        </div>
        <div className="flex items-center gap-2">
          {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
          <Button type="button" size="sm" onClick={() => void copyCode()} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button type="button" size="sm" onClick={downloadCode} className="gap-2">
            <Download className="h-4 w-4" /> Download
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1" aria-label="Website HTML source code">
        <Editor
          height="100%"
          language="html"
          theme="light"
          value={code}
          options={{
            ariaLabel: "Website HTML source code",
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
    </section>
  );
}
