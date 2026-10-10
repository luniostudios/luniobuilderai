"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SelectedElement } from "@/lib/preview-inspector";

type StyleField = { property: string; label: string; placeholder?: string };
type CustomProperty = { id: number; property: string; value: string };

const COLOR_FIELDS: StyleField[] = [
  { property: "color", label: "Text color" },
  { property: "background-color", label: "Background color" },
  { property: "border-color", label: "Border color" },
  { property: "outline-color", label: "Outline color" },
  { property: "text-decoration-color", label: "Text decoration color" },
];

const STYLE_GROUPS: { title: string; fields: StyleField[] }[] = [
  {
    title: "Layout",
    fields: [
      { property: "display", label: "Display", placeholder: "block, flex, grid, none" },
      { property: "position", label: "Position", placeholder: "static, relative, absolute, fixed, sticky" },
      { property: "top", label: "Top" },
      { property: "right", label: "Right" },
      { property: "bottom", label: "Bottom" },
      { property: "left", label: "Left" },
      { property: "inset", label: "Inset" },
      { property: "z-index", label: "Z-index", placeholder: "auto" },
      { property: "float", label: "Float", placeholder: "none, left, right" },
      { property: "clear", label: "Clear" },
      { property: "overflow", label: "Overflow" },
      { property: "overflow-x", label: "Overflow X" },
      { property: "overflow-y", label: "Overflow Y" },
      { property: "visibility", label: "Visibility" },
      { property: "box-sizing", label: "Box sizing", placeholder: "border-box" },
      { property: "isolation", label: "Isolation" },
      { property: "aspect-ratio", label: "Aspect ratio", placeholder: "auto, 16 / 9" },
      { property: "object-fit", label: "Object fit" },
      { property: "object-position", label: "Object position" },
    ],
  },
  {
    title: "Flexbox & grid",
    fields: [
      { property: "flex-direction", label: "Flex direction" },
      { property: "flex-wrap", label: "Flex wrap" },
      { property: "flex-flow", label: "Flex flow" },
      { property: "flex-grow", label: "Flex grow" },
      { property: "flex-shrink", label: "Flex shrink" },
      { property: "flex-basis", label: "Flex basis" },
      { property: "flex", label: "Flex shorthand" },
      { property: "align-items", label: "Align items" },
      { property: "align-content", label: "Align content" },
      { property: "align-self", label: "Align self" },
      { property: "justify-content", label: "Justify content" },
      { property: "justify-items", label: "Justify items" },
      { property: "justify-self", label: "Justify self" },
      { property: "place-items", label: "Place items" },
      { property: "place-content", label: "Place content" },
      { property: "gap", label: "Gap" },
      { property: "row-gap", label: "Row gap" },
      { property: "column-gap", label: "Column gap" },
      { property: "grid-template-columns", label: "Grid columns" },
      { property: "grid-template-rows", label: "Grid rows" },
      { property: "grid-template-areas", label: "Grid areas" },
      { property: "grid-auto-columns", label: "Grid auto columns" },
      { property: "grid-auto-rows", label: "Grid auto rows" },
      { property: "grid-auto-flow", label: "Grid auto flow" },
      { property: "grid-column", label: "Grid column" },
      { property: "grid-row", label: "Grid row" },
      { property: "order", label: "Order" },
    ],
  },
  {
    title: "Size",
    fields: [
      { property: "width", label: "Width", placeholder: "auto, 100%, 320px" },
      { property: "height", label: "Height", placeholder: "auto, 100%, 320px" },
      { property: "min-width", label: "Min width" },
      { property: "max-width", label: "Max width" },
      { property: "min-height", label: "Min height" },
      { property: "max-height", label: "Max height" },
      { property: "inline-size", label: "Inline size" },
      { property: "block-size", label: "Block size" },
      { property: "min-inline-size", label: "Min inline size" },
      { property: "max-inline-size", label: "Max inline size" },
      { property: "min-block-size", label: "Min block size" },
      { property: "max-block-size", label: "Max block size" },
    ],
  },
  {
    title: "Spacing",
    fields: [
      { property: "margin", label: "Margin" },
      { property: "margin-top", label: "Margin top" },
      { property: "margin-right", label: "Margin right" },
      { property: "margin-bottom", label: "Margin bottom" },
      { property: "margin-left", label: "Margin left" },
      { property: "margin-inline", label: "Margin inline" },
      { property: "margin-block", label: "Margin block" },
      { property: "padding", label: "Padding" },
      { property: "padding-top", label: "Padding top" },
      { property: "padding-right", label: "Padding right" },
      { property: "padding-bottom", label: "Padding bottom" },
      { property: "padding-left", label: "Padding left" },
      { property: "padding-inline", label: "Padding inline" },
      { property: "padding-block", label: "Padding block" },
    ],
  },
  {
    title: "Typography",
    fields: [
      { property: "font-family", label: "Font family", placeholder: "inherit" },
      { property: "font-size", label: "Font size", placeholder: "16px, 1rem, clamp(...)" },
      { property: "font-weight", label: "Font weight", placeholder: "400, 700, bold" },
      { property: "font-style", label: "Font style" },
      { property: "font-variant", label: "Font variant" },
      { property: "font-stretch", label: "Font stretch" },
      { property: "font", label: "Font shorthand" },
      { property: "line-height", label: "Line height", placeholder: "1.5, 24px" },
      { property: "letter-spacing", label: "Letter spacing" },
      { property: "word-spacing", label: "Word spacing" },
      { property: "text-align", label: "Text alignment" },
      { property: "text-align-last", label: "Text align last" },
      { property: "text-indent", label: "Text indent" },
      { property: "text-transform", label: "Text transform" },
      { property: "text-decoration", label: "Text decoration" },
      { property: "text-decoration-line", label: "Decoration line" },
      { property: "text-decoration-style", label: "Decoration style" },
      { property: "text-decoration-thickness", label: "Decoration thickness" },
      { property: "text-underline-offset", label: "Underline offset" },
      { property: "text-shadow", label: "Text shadow" },
      { property: "text-overflow", label: "Text overflow" },
      { property: "white-space", label: "White space" },
      { property: "overflow-wrap", label: "Overflow wrap" },
      { property: "word-break", label: "Word break" },
      { property: "hyphens", label: "Hyphens" },
      { property: "direction", label: "Text direction" },
      { property: "vertical-align", label: "Vertical align" },
      { property: "writing-mode", label: "Writing mode" },
      { property: "text-wrap", label: "Text wrap" },
      { property: "line-clamp", label: "Line clamp" },
      { property: "list-style", label: "List style" },
    ],
  },
  {
    title: "Backgrounds",
    fields: [
      { property: "background", label: "Background shorthand" },
      { property: "background-image", label: "Background image" },
      { property: "background-position", label: "Background position" },
      { property: "background-size", label: "Background size" },
      { property: "background-repeat", label: "Background repeat" },
      { property: "background-attachment", label: "Background attachment" },
      { property: "background-origin", label: "Background origin" },
      { property: "background-clip", label: "Background clip" },
      { property: "background-blend-mode", label: "Background blend mode" },
    ],
  },
  {
    title: "Borders & outlines",
    fields: [
      { property: "border", label: "Border shorthand" },
      { property: "border-width", label: "Border width" },
      { property: "border-style", label: "Border style" },
      { property: "border-radius", label: "Corner radius" },
      { property: "border-top", label: "Border top" },
      { property: "border-right", label: "Border right" },
      { property: "border-bottom", label: "Border bottom" },
      { property: "border-left", label: "Border left" },
      { property: "border-top-left-radius", label: "Top-left radius" },
      { property: "border-top-right-radius", label: "Top-right radius" },
      { property: "border-bottom-right-radius", label: "Bottom-right radius" },
      { property: "border-bottom-left-radius", label: "Bottom-left radius" },
      { property: "outline", label: "Outline" },
      { property: "outline-width", label: "Outline width" },
      { property: "outline-style", label: "Outline style" },
      { property: "outline-offset", label: "Outline offset" },
      { property: "box-shadow", label: "Box shadow" },
      { property: "border-image", label: "Border image" },
    ],
  },
  {
    title: "Effects & motion",
    fields: [
      { property: "opacity", label: "Opacity", placeholder: "0 to 1" },
      { property: "filter", label: "Filter" },
      { property: "backdrop-filter", label: "Backdrop filter" },
      { property: "mix-blend-mode", label: "Mix blend mode" },
      { property: "transform", label: "Transform" },
      { property: "transform-origin", label: "Transform origin" },
      { property: "transform-style", label: "Transform style" },
      { property: "perspective", label: "Perspective" },
      { property: "perspective-origin", label: "Perspective origin" },
      { property: "backface-visibility", label: "Backface visibility" },
      { property: "transition", label: "Transition shorthand" },
      { property: "transition-property", label: "Transition property" },
      { property: "transition-duration", label: "Transition duration" },
      { property: "transition-timing-function", label: "Transition easing" },
      { property: "transition-delay", label: "Transition delay" },
      { property: "animation", label: "Animation shorthand" },
      { property: "animation-name", label: "Animation name" },
      { property: "animation-duration", label: "Animation duration" },
      { property: "animation-timing-function", label: "Animation easing" },
      { property: "animation-delay", label: "Animation delay" },
      { property: "animation-iteration-count", label: "Animation iterations" },
      { property: "animation-direction", label: "Animation direction" },
      { property: "animation-fill-mode", label: "Animation fill mode" },
      { property: "animation-play-state", label: "Animation play state" },
    ],
  },
  {
    title: "Other",
    fields: [
      { property: "cursor", label: "Cursor" },
      { property: "pointer-events", label: "Pointer events" },
      { property: "user-select", label: "User select" },
      { property: "resize", label: "Resize" },
      { property: "content", label: "Content" },
      { property: "appearance", label: "Appearance" },
      { property: "clip-path", label: "Clip path" },
      { property: "mask", label: "Mask shorthand" },
      { property: "scroll-behavior", label: "Scroll behavior" },
      { property: "scroll-snap-align", label: "Scroll snap align" },
      { property: "accent-color", label: "Accent color" },
      { property: "caret-color", label: "Caret color" },
      { property: "color-scheme", label: "Color scheme" },
      { property: "columns", label: "Columns" },
      { property: "column-count", label: "Column count" },
      { property: "break-inside", label: "Break inside" },
    ],
  },
];

const KNOWN_PROPERTIES = [...new Set([
  ...COLOR_FIELDS.map(({ property }) => property),
  ...STYLE_GROUPS.flatMap(({ fields }) => fields.map(({ property }) => property)),
])];

type ElementStylePanelProps = {
  selection: SelectedElement;
  saving: boolean;
  onChange: (property: string, value: string) => void;
  onImageUrlChange: (value: string) => void;
  onDelete: () => void;
  deleting: boolean;
  deleteError: string;
  onClose: () => void;
};

function colorPickerValue(value: string | undefined): string {
  if (!value) return "#000000";
  if (/^#[\da-f]{6}$/i.test(value)) return value;

  const channels = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!channels) return "#000000";

  return `#${channels.slice(1, 4).map((channel) => Number(channel).toString(16).padStart(2, "0")).join("")}`;
}

function isCssPropertyName(value: string): boolean {
  return /^(--[a-zA-Z0-9_-]+|-?[a-zA-Z][a-zA-Z0-9-]*)$/.test(value.trim());
}

export default function ElementStylePanel({
  selection,
  ...props
}: ElementStylePanelProps) {
  return <ElementStylePanelContent key={selection.selector} selection={selection} {...props} />;
}

function ElementStylePanelContent({
  selection,
  saving,
  onChange,
  onImageUrlChange,
  onDelete,
  deleting,
  deleteError,
  onClose,
}: ElementStylePanelProps) {
  const [draftStyles, setDraftStyles] = useState(selection.styles);
  const [customProperties, setCustomProperties] = useState<CustomProperty[]>([]);
  const [propertyError, setPropertyError] = useState("");
  const title = selection.id ? `${selection.tagName}#${selection.id}` : selection.tagName;
  const canDelete = !["html", "head", "body"].includes(selection.tagName.toLowerCase());
  const availableProperties = [...new Set([...KNOWN_PROPERTIES, ...Object.keys(selection.styles)])].sort();

  function updateStyle(property: string, value: string) {
    setDraftStyles((current) => ({ ...current, [property]: value }));
    onChange(property, value);
  }

  function commitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  function addCustomProperty() {
    setCustomProperties((current) => [
      ...current,
      { id: Date.now() + Math.random(), property: "", value: "" },
    ]);
  }

  function updateCustomProperty(id: number, property: string, value: string) {
    setCustomProperties((current) => current.map((item) =>
      item.id === id ? { ...item, property, value } : item
    ));
    setPropertyError("");
  }

  function applyCustomProperty(property: string, value: string) {
    const normalizedProperty = property.trim();
    if (!isCssPropertyName(normalizedProperty)) {
      setPropertyError("Enter a valid CSS property name, such as display or --my-variable.");
      return false;
    }
    setPropertyError("");
    updateStyle(normalizedProperty, value);
    return true;
  }

  function removeCustomProperty(item: CustomProperty) {
    if (item.property.trim() && isCssPropertyName(item.property)) updateStyle(item.property.trim(), "");
    setCustomProperties((current) => current.filter(({ id }) => id !== item.id));
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
          {selection.tagName === "img" && (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Image URL</span>
              <input
                type="url"
                value={selection.imageUrl}
                onChange={(event) => onImageUrlChange(event.target.value)}
                disabled={deleting}
                placeholder="https://example.com/image.jpg"
                aria-label="Image URL"
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </label>
          )}

          <details open className="group rounded-md border border-border/70">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold">Color</summary>
            <div className="space-y-3 border-t border-border/70 p-3">
              {COLOR_FIELDS.map((field) => (
                <label key={field.property} className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
                  <span className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorPickerValue(draftStyles[field.property])}
                      onChange={(event) => updateStyle(field.property, event.target.value)}
                      disabled={deleting}
                      aria-label={`${field.label} picker`}
                      className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
                    />
                    <input
                      type="text"
                      value={draftStyles[field.property] ?? ""}
                      onChange={(event) => updateStyle(field.property, event.target.value)}
                      onKeyDown={commitOnEnter}
                      disabled={deleting}
                      placeholder="CSS color, e.g. #000 or transparent"
                      aria-label={`${field.label} CSS value`}
                      className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    />
                  </span>
                </label>
              ))}
            </div>
          </details>

          {STYLE_GROUPS.map((group) => (
            <details key={group.title} open={["Layout", "Size", "Spacing", "Typography"].includes(group.title)} className="rounded-md border border-border/70">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold">{group.title}</summary>
              <div className="space-y-3 border-t border-border/70 p-3">
                {group.fields.map((field) => (
                  <label key={field.property} className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
                    <input
                      value={draftStyles[field.property] ?? ""}
                      onChange={(event) => updateStyle(field.property, event.target.value)}
                      onKeyDown={commitOnEnter}
                      placeholder={field.placeholder ?? ""}
                      aria-label={field.label}
                      className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    />
                  </label>
                ))}
              </div>
            </details>
          ))}

          <details className="rounded-md border border-border/70">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold">Any CSS property</summary>
            <div className="space-y-3 border-t border-border/70 p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Add any standard CSS property or custom property. Values use normal CSS syntax and are applied by the browser.
              </p>
              <datalist id="element-css-properties">
                {availableProperties.map((property) => <option key={property} value={property} />)}
              </datalist>
              {customProperties.map((item, index) => (
                <div key={item.id} className="space-y-2 rounded-md bg-muted/40 p-2.5">
                  <div className="flex items-center gap-2">
                    <label className="min-w-0 flex-1 space-y-1">
                      <span className="text-[10px] font-medium text-muted-foreground">CSS property</span>
                      <input
                        list="element-css-properties"
                        value={item.property}
                        onChange={(event) => {
                          const property = event.target.value;
                          const value = selection.styles[property] ?? "";
                          updateCustomProperty(item.id, property, value);
                        }}
                        onBlur={() => {
                          if (item.property && !isCssPropertyName(item.property)) {
                            setPropertyError("Enter a valid CSS property name, such as display or --my-variable.");
                          }
                        }}
                        disabled={deleting}
                        placeholder="e.g. clip-path or --brand-color"
                        aria-label={`CSS property ${index + 1}`}
                        className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeCustomProperty(item)}
                      disabled={deleting}
                      aria-label="Remove CSS property"
                      className="mt-5 rounded-md p-2 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-medium text-muted-foreground">CSS value</span>
                    <input
                      value={item.value}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateCustomProperty(item.id, item.property, value);
                        if (isCssPropertyName(item.property)) applyCustomProperty(item.property, value);
                      }}
                      disabled={deleting || !item.property}
                      placeholder="Enter a CSS value"
                      aria-label={`CSS value ${index + 1}`}
                      className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    />
                  </label>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={addCustomProperty} disabled={deleting}>
                <Plus className="h-4 w-4" /> Add CSS property
              </Button>
              {propertyError && <p role="alert" className="text-xs text-destructive">{propertyError}</p>}
            </div>
          </details>
        </div>
      </div>

      <footer className="shrink-0 space-y-2 border-t border-border/70 px-4 py-3">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full gap-2"
          aria-label={`Delete selected ${title}`}
          title={canDelete ? "Delete selected element" : "The document structure cannot be deleted"}
          disabled={saving || deleting || !canDelete}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete element"}
        </Button>
        {deleteError && <p role="alert" className="text-xs text-destructive">{deleteError}</p>}
        <p className="text-xs text-muted-foreground">{saving ? "Saving changes…" : "Changes save automatically"}</p>
      </footer>
    </aside>
  );
}
