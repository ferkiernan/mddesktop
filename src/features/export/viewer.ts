// Off-screen viewer: renders the document with the same component and style the user sees
// (mdwysiwyg, read-only) in a hidden container, so the export never depends on which view or tab
// is visible and always uses the current, possibly unsaved, content (research R1).
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { EDITOR_CLASS } from "../settings/applyStyle";
import { LazyMarkdownEditor } from "../editor/lazy";
import { makeImageResolver } from "../images/resolveSrc";
import { CONTENT_WIDTH_PX } from "./constants";

const MAX_WAIT_MS = 15_000;
/** Class of the hidden viewer when an explicit export style is used (no active-style rule matches it). */
export const EXPORT_EDITOR_CLASS = "mdd-export-editor";
const QUIET_MS = 350;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Resolves when the DOM under `el` stops changing for `quietMs`, or after `maxMs`. */
function untilQuiet(el: HTMLElement, quietMs: number, maxMs: number): Promise<void> {
  return new Promise((resolve) => {
    let timer = setTimeout(done, quietMs);
    const deadline = setTimeout(done, maxMs);
    const obs = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(done, quietMs);
    });
    obs.observe(el, { subtree: true, childList: true, attributes: true, characterData: true });
    function done() {
      obs.disconnect();
      clearTimeout(timer);
      clearTimeout(deadline);
      resolve();
    }
  });
}

/** Mermaid blocks render asynchronously (lazy-loaded library): wait until each has an svg or its fallback. */
function mermaidPending(root: HTMLElement): boolean {
  return Array.from(root.querySelectorAll("[data-mermaid-block]")).some(
    (b) => !b.querySelector("svg") && !b.querySelector("pre"),
  );
}

export interface ViewerHandle {
  /** The element holding the rendered document (ProseMirror content). */
  content: HTMLElement;
  /** The ancestor that paints the content background (used as the page background). */
  background: HTMLElement;
}

/**
 * Mounts the hidden viewer, waits until it is fully rendered (editor, Mermaid, images, fonts),
 * runs `fn`, and always tears the viewer down.
 */
export async function withViewer<T>(
  markdown: string,
  fn: (v: ViewerHandle) => Promise<T>,
  documentId?: string,
  /** Export style (spec 005): its variables are declared on the host and the active style's class is not used. */
  styleVars?: Record<string, string>,
): Promise<T> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${CONTENT_WIDTH_PX + 80}px;height:auto;overflow:visible;pointer-events:none;`;
  for (const [k, v] of Object.entries(styleVars ?? {})) host.style.setProperty(k, v);
  // the on-screen content zoom (spec 007) and toolbar scale never reach an export
  host.style.setProperty("--mdw-content-zoom", "1");
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(
      createElement(LazyMarkdownEditor, {
        initialContent: markdown,
        onlyView: true,
        resizable: false,
        width: "100%",
        height: "auto",
        className: styleVars ? EXPORT_EDITOR_CLASS : EDITOR_CLASS,
        // relative image paths resolve against the document (upstream resolveImageSrc, see EditorAdapter)
        ...(documentId ? { resolveImageSrc: makeImageResolver(documentId) } : {}),
      }),
    );

    const start = Date.now();
    let content: HTMLElement | null = null;
    while (Date.now() - start < MAX_WAIT_MS) {
      content = host.querySelector<HTMLElement>(".ProseMirror");
      if (content) break;
      await sleep(30);
    }
    if (!content) throw new Error("No se pudo preparar el visor para exportar");

    await untilQuiet(host, QUIET_MS, MAX_WAIT_MS);
    while (mermaidPending(host) && Date.now() - start < MAX_WAIT_MS) await sleep(100);
    await Promise.all(
      Array.from(content.querySelectorAll("img")).map((img) =>
        img.complete ? undefined : new Promise<void>((r) => ((img.onload = img.onerror = () => r()), undefined)),
      ),
    );
    await document.fonts?.ready;

    return await fn({ content, background: backgroundAncestor(content, host) });
  } finally {
    root.unmount();
    host.remove();
  }
}

/** First ancestor (up to the viewer root) with a painted background; the viewer root itself otherwise. */
export function backgroundAncestor(el: HTMLElement, stop: HTMLElement): HTMLElement {
  let cur: HTMLElement | null = el;
  while (cur && cur !== stop) {
    const cs = getComputedStyle(cur);
    if (cs.backgroundImage !== "none" || (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent")) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return stop;
}
