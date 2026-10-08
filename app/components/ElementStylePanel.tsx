"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { SelectedElement } from "@/lib/preview-inspector";

const COLOR_FIELDS = [
  { property: "color", label: "Text color" },
  { property: "background-color", label: "Background" },
  { property: "border-color", label: "Border color" },
] as const;

const FIELDS = [
  { property: "font-family", label: "Font family", placeholder: "inherit" },
  { property: "font-size", label: "Font size", placeholder: "16px" },
  { property: "font-weight", label: "Font weight", placeholder: "400" },
  { property: "text-align", label: "Text alignment", placeholder: "left" },
  { property: "line-height", label: "Line height", placeholder: "1.5" },
  { property: "padding", label: "Padding", placeholder: "16px" },
  { property: "margin", label: "Margin", placeholder: "0" },
  { property: "border-radius", label: "Corner radius", placeholder: "0px" },
  { property: "border-width", label: "Border width", placeholder: "0px" },
  { property: "max-width", label: "Max width", placeholder: "none" },
  { property: "opacity", label: "Opacity", placeholder: "1" },
] as const;

function colorPickerValue(value: string | undefined): string {
  if (!value) return "#000000";
  if (/^#[\da-f]{6}$/i.test(value)) return value;

  const channels = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!channels) return "#000000";

  return `#${channels.slice(1, 4).map((channel) => Number(channel).toString(16).padStart(2, "0")).join("")}`;
}

export default function ElementStylePanel({
  selection,
  saving,
  onChange,
  onClose,
}: {
  selection: SelectedElement;
  saving: boolean;
  onChange: (property: string, value: string) => void;
  onClose: () => void;
}) {
  const [draftStyles, setDraftStyles] = useState(selection.styles);
  const title = selection.id ? `${selection.tagName}#${selection.id}` : selection.tagName;

  function updateStyle(property: string, value: string) {
    setDraftStyles((current) => ({ ...current, [property]: value }));
    onChange(property, value);
  }

  return (
    <aside aria-label="Element styles" className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Selected element</p>
          <h2 className="truncate font-heading text-sm font-semibold">{title}</h2>
          {selection.text && <p className="mt-1 truncate text-xs text-muted-foreground">{selection.text}</p>}
        </div>
        <button
          type="button"
          aria-label="Close style panel"
          onClick={onClose}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-3">
          {COLOR_FIELDS.map((field) => (
            <label key={field.property} className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
              <span className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorPickerValue(draftStyles[field.property])}
                  onChange={(event) => updateStyle(field.property, event.target.value)}
                  aria-label={`${field.label} picker`}
                  className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
                />
                <input
                  type="text"
                  value={draftStyles[field.property] ?? ""}
                  onChange={(event) => updateStyle(field.property, event.target.value)}
                  placeholder="#000000 or transparent"
                  aria-label={`${field.label} CSS value`}
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </span>
            </label>
          ))}
          {FIELDS.map((field) => (
            <label key={field.property} className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
              <input
                value={draftStyles[field.property] ?? ""}
                onChange={(event) => updateStyle(field.property, event.target.value)}
                placeholder={field.placeholder}
                aria-label={field.label}
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </label>
          ))}
        </div>
      </div>

      <footer className="shrink-0 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
        {saving ? "Saving changes…" : "Changes save automatically"}
      </footer>
    </aside>
  );
}