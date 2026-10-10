"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  MAX_IMAGE_ATTACHMENT_BYTES,
  MAX_IMAGE_ATTACHMENTS,
  MAX_IMAGE_ATTACHMENTS_BYTES,
  type ImageAttachment,
} from "@/lib/image-attachments";

type Props = {
  images: ImageAttachment[];
  onChange: (images: ImageAttachment[]) => void;
  disabled?: boolean;
  compact?: boolean;
};

function readOptimizedImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("This image could not be processed."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/webp", 0.82).split(",")[1] ?? "");
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This image could not be opened."));
    };
    image.src = objectUrl;
  });
}

export default function ImageAttachments({ images, onChange, disabled = false, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setError("");
    if (files.length + images.length > MAX_IMAGE_ATTACHMENTS) {
      setError(`Add up to ${MAX_IMAGE_ATTACHMENTS} images per prompt.`);
      return;
    }
    if (files.some((file) => !file.type.startsWith("image/") || file.size > 12 * 1024 * 1024)) {
      setError("Choose image files smaller than 12 MB each.");
      return;
    }

    setProcessing(true);
    try {
      const added: ImageAttachment[] = [];
      let totalBytes = images.reduce((total, image) => total + Math.floor(image.data.length * 3 / 4), 0);
      for (const file of files) {
        const data = await readOptimizedImage(file);
        const bytes = Math.floor(data.length * 3 / 4);
        if (!data || bytes > MAX_IMAGE_ATTACHMENT_BYTES || totalBytes + bytes > MAX_IMAGE_ATTACHMENTS_BYTES) {
          throw new Error("Optimized images must be under 1 MB each and 1.5 MB total.");
        }
        totalBytes += bytes;
        added.push({ name: file.name, mimeType: "image/webp", data, intent: "reference" });
      }
      onChange([...images, ...added]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add these images.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Attached images">
          {images.map((image, index) => (
            <li key={`${image.name}-${index}`} className="flex max-w-full items-center gap-2 border border-border/80 bg-background p-1.5">
              <span
                role="img"
                aria-label={`Preview of ${image.name}`}
                style={{ backgroundImage: `url("data:${image.mimeType};base64,${image.data}")` }}
                className="h-10 w-10 shrink-0 bg-cover bg-center"
              />
              <span className="max-w-32 truncate text-xs" title={image.name}>{image.name}</span>
              <select
                value={image.intent}
                aria-label={`How to use ${image.name}`}
                disabled={disabled}
                onChange={(event) => onChange(images.map((item, itemIndex) => itemIndex === index
                  ? { ...item, intent: event.target.value as ImageAttachment["intent"] }
                  : item))}
                className="h-8 max-w-32 border border-input bg-background px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="reference">Visual reference</option>
                <option value="use">Use on website</option>
              </select>
              <button
                type="button"
                aria-label={`Remove ${image.name}`}
                disabled={disabled}
                onClick={() => onChange(images.filter((_, itemIndex) => itemIndex !== index))}
                className="grid h-7 w-7 shrink-0 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => void handleFiles(event)} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || processing || images.length >= MAX_IMAGE_ATTACHMENTS}
          aria-label="Add reference or website images"
          title="Add images"
          className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 ${compact ? "h-7" : "h-8 border border-border/70 px-2.5 hover:bg-muted/60"}`}
        >
          <ImagePlus className="h-4 w-4" /> {processing ? "Preparing..." : "Add images"}
        </button>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <span className="sr-only">Each image is optimized before upload. Up to {MAX_IMAGE_ATTACHMENTS} images, 1.5 MB total.</span>
      </div>
    </div>
  );
}