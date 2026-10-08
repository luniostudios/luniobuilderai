export type SelectedElement = {
  selector: string;
  tagName: string;
  id: string;
  text: string;
  styles: Record<string, string>;
};

const INSPECTOR = String.raw`<style id="foundry-inspector-styles">
  [data-foundry-selected] {
    outline: 2px solid #1687ff !important;
    outline-offset: 2px !important;
    cursor: crosshair !important;
  }
  html { cursor: crosshair; }
</style>
<script>
(() => {
  const styleProperties = [
    "color", "background-color", "font-family", "font-size", "font-weight",
    "text-align", "line-height", "padding", "margin", "border-radius",
    "border-width", "border-color", "max-width", "opacity"
  ];

  function selectorFor(element) {
    const parts = [];
    let current = element;
    while (current && current.nodeType === 1) {
      let part = current.tagName.toLowerCase();
      if (current.id) {
        part += "#" + CSS.escape(current.id);
        parts.unshift(part);
        break;
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((sibling) => sibling.tagName === current.tagName);
        if (siblings.length > 1) part += ":nth-of-type(" + (siblings.indexOf(current) + 1) + ")";
      }
      parts.unshift(part);
      current = parent;
    }
    return parts.join(" > ");
  }

  function select(element) {
    document.querySelectorAll("[data-foundry-selected]").forEach((node) => node.removeAttribute("data-foundry-selected"));
    element.setAttribute("data-foundry-selected", "");
    const computed = getComputedStyle(element);
    const styles = {};
    styleProperties.forEach((property) => { styles[property] = computed.getPropertyValue(property); });
    window.parent.postMessage({
      type: "foundry:select",
      payload: {
        selector: selectorFor(element),
        tagName: element.tagName.toLowerCase(),
        id: element.id,
        text: (element.innerText || element.textContent || "").trim().slice(0, 140),
        styles
      }
    }, "*");
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    event.preventDefault();
    event.stopPropagation();
    select(event.target);
  }, true);

  document.addEventListener("submit", (event) => event.preventDefault(), true);

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || !event.data || event.data.type !== "foundry:select-element") return;
    try {
      const element = document.querySelector(event.data.selector);
      if (element) select(element);
    } catch {}
  });
})();
</script>`;

export function injectPreviewInspector(html: string): string {
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${INSPECTOR}</body>`);
  }
  return `${html}${INSPECTOR}`;
}

export function patchElementStyle(html: string, selector: string, property: string, value: string): string {
  try {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const element = parsed.querySelector(selector);
    if (!element) return html;
    if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) return html;
    if (value.trim()) element.style.setProperty(property, value.trim());
    else element.style.removeProperty(property);
    return `<!DOCTYPE html>\n${parsed.documentElement.outerHTML}`;
  } catch {
    return html;
  }
}