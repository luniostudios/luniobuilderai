import type { Json } from "@/lib/database.types";

export type CmsField = {
  key: string;
  label: string;
  type: "text" | "image" | "url" | "date";
};

export type CmsItem = {
  id: string;
  values: Record<string, string>;
};

export type CmsCollection = {
  id: string;
  name: string;
  fields: CmsField[];
  items: CmsItem[];
};

export type CmsData = { collections: CmsCollection[] };

export const EMPTY_CMS_DATA: CmsData = { collections: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeCmsData(value: unknown): CmsData | null {
  if (!isRecord(value) || !Array.isArray(value.collections) || value.collections.length > 20) return null;

  const collections: CmsCollection[] = [];
  for (const collection of value.collections) {
    if (
      !isRecord(collection) || typeof collection.id !== "string" || typeof collection.name !== "string" ||
      !Array.isArray(collection.fields) || collection.fields.length > 20 ||
      !Array.isArray(collection.items) || collection.items.length > 200
    ) return null;

    const fields: CmsField[] = [];
    for (const field of collection.fields) {
      if (
        !isRecord(field) || typeof field.key !== "string" || !/^[a-z][a-z0-9_]{0,39}$/.test(field.key) ||
        typeof field.label !== "string" || !["text", "image", "url", "date"].includes(String(field.type))
      ) return null;
      fields.push({ key: field.key, label: field.label.slice(0, 80), type: field.type as CmsField["type"] });
    }

    const items: CmsItem[] = [];
    for (const item of collection.items) {
      if (!isRecord(item) || typeof item.id !== "string" || !isRecord(item.values)) return null;
      const values: Record<string, string> = {};
      for (const field of fields) {
        const fieldValue = item.values[field.key];
        if (fieldValue !== undefined && typeof fieldValue !== "string") return null;
        values[field.key] = typeof fieldValue === "string" ? fieldValue.slice(0, 10000) : "";
      }
      items.push({ id: item.id.slice(0, 80), values });
    }

    collections.push({ id: collection.id.slice(0, 80), name: collection.name.trim().slice(0, 80), fields, items });
  }

  return { collections };
}

export function toCmsJson(data: CmsData): Json {
  return data as unknown as Json;
}

const CMS_BINDING_SCRIPT = `(function(){
  var node = document.getElementById("lunio-cms-data");
  if (!node) return;
  var data;
  try { data = JSON.parse(node.textContent || "{}"); } catch (_) { return; }
  (data.collections || []).forEach(function(collection) {
    document.querySelectorAll("[data-cms-list]").forEach(function(list) {
      if (list.getAttribute("data-cms-list") !== collection.name) return;
      var template = list.querySelector("[data-cms-item]") || list.firstElementChild;
      if (!template) return;
      var fragment = document.createDocumentFragment();
      (collection.items || []).forEach(function(item) {
        var clone = template.cloneNode(true);
        clone.removeAttribute("data-cms-item");
        var bound = [];
        if (clone.matches && clone.matches("[data-cms-field]")) bound.push(clone);
        clone.querySelectorAll("[data-cms-field]").forEach(function(element) { bound.push(element); });
        bound.forEach(function(element) {
          var key = element.getAttribute("data-cms-field");
          var value = item.values && item.values[key];
          if (typeof value !== "string") return;
          if (element instanceof HTMLImageElement) {
            if (/^https?:\\/\\//i.test(value)) element.src = value;
            element.alt = item.values.title || "";
          } else if (element instanceof HTMLAnchorElement) {
            if (/^(https?:|mailto:|tel:|#|\\/)/i.test(value)) element.href = value;
            element.textContent = value;
          } else {
            element.textContent = value;
          }
        });
        fragment.appendChild(clone);
      });
      list.replaceChildren(fragment);
    });
  });
})();`;

export function injectCmsContent(html: string, cmsData: unknown): string {
  const normalized = normalizeCmsData(cmsData);
  if (!normalized?.collections.length) return html;
  const payload = JSON.stringify(normalized).replace(/</g, "\\u003c");
  const binding = `<script type="application/json" id="lunio-cms-data">${payload}</script><script>${CMS_BINDING_SCRIPT}</script>`;
  return /<\/body\s*>/i.test(html)
    ? html.replace(/<\/body\s*>/i, `${binding}</body>`)
    : `${html}${binding}`;
}