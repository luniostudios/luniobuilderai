export type ImageIntent = "reference" | "use";

export type ImageAttachment = {
  name: string;
  mimeType: "image/webp";
  data: string;
  intent: ImageIntent;
};

export const MAX_IMAGE_ATTACHMENTS = 4;
export const MAX_IMAGE_ATTACHMENT_BYTES = 1024 * 1024;
export const MAX_IMAGE_ATTACHMENTS_BYTES = 1536 * 1024;

export function parseImageAttachments(value: unknown): ImageAttachment[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_IMAGE_ATTACHMENTS) return null;

  let totalBytes = 0;
  const attachments: ImageAttachment[] = [];
  for (const item of value) {
    if (
      !item || typeof item !== "object" ||
      !("name" in item) || typeof item.name !== "string" ||
      !("mimeType" in item) || item.mimeType !== "image/webp" ||
      !("data" in item) || typeof item.data !== "string" ||
      !("intent" in item) || (item.intent !== "reference" && item.intent !== "use")
    ) return null;

    const data = item.data.replace(/^data:image\/webp;base64,/, "");
    if (!data || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
    const bytes = Math.floor(data.length * 3 / 4);
    totalBytes += bytes;
    if (bytes > MAX_IMAGE_ATTACHMENT_BYTES || totalBytes > MAX_IMAGE_ATTACHMENTS_BYTES) return null;
    attachments.push({
      name: item.name.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 160),
      mimeType: "image/webp",
      data,
      intent: item.intent,
    });
  }

  return attachments;
}