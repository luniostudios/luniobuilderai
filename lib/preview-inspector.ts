export type SelectedElement = {
  selector: string;
  tagName: string;
  id: string;
  text: string;
  imageUrl: string;
  styles: Record<string, string>;
};

const INSPECTOR = String.raw`<style id="foundry-inspector-styles">
  [data-foundry-selected] {
    outline: 2px solid #1687ff !important;
    outline-offset: 2px !important;
    cursor: pointer !important;
  }
  [data-foundry-editing] {
    outline: 2px dashed #1687ff !important;
    outline-offset: 2px !important;
    cursor: text !important;
  }
  html { cursor: crosshair; }
</style>
<script>
(() => {
  let mode = "edit";
  let activeEditor = null;

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
    for (let index = 0; index < computed.length; index += 1) {
      const property = computed.item(index);
      styles[property] = computed.getPropertyValue(property);
    }
    window.parent.postMessage({
      type: "foundry:select",
      payload: {
        selector: selectorFor(element),
        tagName: element.tagName.toLowerCase(),
        id: element.id,
        text: (element.innerText || element.textContent || "").trim().slice(0, 140),
        imageUrl: element instanceof HTMLImageElement ? element.getAttribute("src") || "" : "",
        styles
      }
    }, "*");
  }

  function finishEditing(save) {
    if (!activeEditor) return;
    const { element, editor, originalText } = activeEditor;
    activeEditor = null;
    element.removeAttribute("data-foundry-editing");
    editor.remove();
    if (!save || editor.value === originalText) return;

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let firstTextNode = null;
    let textNode;
    while ((textNode = walker.nextNode())) {
      if (!textNode.nodeValue?.trim()) continue;
      if (!firstTextNode) firstTextNode = textNode;
      else textNode.nodeValue = "";
    }
    if (firstTextNode) firstTextNode.nodeValue = editor.value;
    else element.appendChild(document.createTextNode(editor.value));

    window.parent.postMessage({
      type: "foundry:text-change",
      payload: { selector: selectorFor(element), text: editor.value }
    }, "*");
  }

  function editText(element) {
    finishEditing(true);
    const originalText = element.innerText || element.textContent || "";
    if (!originalText.trim()) return;

    const rect = element.getBoundingClientRect();
    const computed = getComputedStyle(element);
    const editor = document.createElement("textarea");
    editor.value = originalText;
    editor.setAttribute("data-foundry-editing", "");
    editor.setAttribute("aria-label", "Edit element text");
    Object.assign(editor.style, {
      position: "fixed",
      zIndex: "2147483647",
      left: rect.left + "px",
      top: rect.top + "px",
      width: Math.max(rect.width, 120) + "px",
      height: Math.max(rect.height, 32) + "px",
      boxSizing: "border-box",
      margin: "0",
      padding: computed.padding,
      border: "2px dashed #1687ff",
      borderRadius: "2px",
      outline: "none",
      resize: "none",
      background: "#fff",
      color: computed.color,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      textAlign: computed.textAlign,
      whiteSpace: "wrap",
      overflow: "hidden",
    });
    document.body.appendChild(editor);
    element.setAttribute("data-foundry-editing", "");
    activeEditor = { element, editor, originalText };

    editor.addEventListener("blur", () => finishEditing(true), { once: true });
    editor.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finishEditing(false);
      } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        finishEditing(true);
      }
    });
    editor.focus();
    editor.select();
  }

  function setMode(nextMode) {
    mode = nextMode === "preview" ? "preview" : "edit";
    if (mode === "preview") finishEditing(true);
    const inspectorStyles = document.getElementById("foundry-inspector-styles");
    if (inspectorStyles) inspectorStyles.disabled = mode === "preview";
    if (mode === "preview") {
      document.querySelectorAll("[data-foundry-selected]").forEach((node) => node.removeAttribute("data-foundry-selected"));
    }
  }

  document.addEventListener("click", (event) => {
    if (mode === "preview") return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("[data-foundry-editing]")) return;
    finishEditing(true);
    event.preventDefault();
    event.stopPropagation();
    select(event.target);
  }, true);

  document.addEventListener("dblclick", (event) => {
    if (mode === "preview") return;
    const element = event.target instanceof HTMLElement
      ? event.target
      : event.target instanceof Element
        ? event.target.closest("a, button")
        : null;
    if (!(element instanceof HTMLElement) || ["HTML", "BODY", "SCRIPT", "STYLE", "INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(element.tagName)) return;
    if (element.closest("[contenteditable='true']")) return;
    event.preventDefault();
    event.stopPropagation();
    editText(element);
  }, true);

  document.addEventListener("submit", (event) => {
    if (mode === "edit") event.preventDefault();
  }, true);

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || !event.data) return;
    if (event.data.type === "foundry:set-mode") {
      setMode(event.data.mode);
      return;
    }
    if (mode !== "edit" || event.data.type !== "foundry:select-element") return;
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
    const normalizedProperty = property.trim();
    if (!/^(--[a-zA-Z0-9_-]+|-?[a-zA-Z][a-zA-Z0-9-]*)$/.test(normalizedProperty)) return html;
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const element = parsed.querySelector(selector);
    if (!element) return html;
    if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) return html;
    if (value.trim()) {
      const importantValue = value.trim().match(/^(.*?)(?:\s*!important)\s*$/i);
      if (importantValue) element.style.setProperty(normalizedProperty, importantValue[1].trim(), "important");
      else element.style.setProperty(normalizedProperty, value.trim());
    } else element.style.removeProperty(normalizedProperty);
    return `<!DOCTYPE html>\n${parsed.documentElement.outerHTML}`;
  } catch {
    return html;
  }
}

export function patchElementImage(html: string, selector: string, imageUrl: string): string {
  try {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const element = parsed.querySelector(selector);
    if (!(element instanceof HTMLImageElement)) return html;
    element.removeAttribute("srcset");
    if (imageUrl.trim()) element.setAttribute("src", imageUrl.trim());
    else element.removeAttribute("src");
    return `<!DOCTYPE html>\n${parsed.documentElement.outerHTML}`;
  } catch {
    return html;
  }
}

export function patchElementText(html: string, selector: string, text: string): string {
  try {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const element = parsed.querySelector(selector);
    if (!(element instanceof HTMLElement)) return html;
    if (element.textContent === text) return html;
    const walker = parsed.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let firstTextNode: Node | null = null;
    let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      if (!textNode.nodeValue?.trim()) continue;
      if (!firstTextNode) firstTextNode = textNode;
      else textNode.nodeValue = "";
    }
    if (firstTextNode) firstTextNode.nodeValue = text;
    else element.appendChild(parsed.createTextNode(text));
    return `<!DOCTYPE html>\n${parsed.documentElement.outerHTML}`;
  } catch {
    return html;
  }
}

export function patchElementDelete(html: string, selector: string): string {
  try {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const element = parsed.querySelector(selector);
    if (!element || ["html", "head", "body"].includes(element.tagName.toLowerCase())) return html;
    element.remove();
    return `<!DOCTYPE html>\n${parsed.documentElement.outerHTML}`;
  } catch {
    return html;
  }
}