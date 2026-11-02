// DOM -> self-contained markup. Every element receives the visual properties it ends up with in the
// viewer (computed values, so CSS variables and the active style are already resolved); Mermaid SVGs
// become embedded images; local images become data: URIs. Nothing depends on external CSS or files.

export interface Snapshot {
  /** Well-formed XHTML fragment of the document body (no wrapper page). */
  html: string;
  /** CSS declarations (`background-*`) of the viewer content area: colour, gradient or image. */
  backgroundCss: string;
  /** Text colour / font of the content area, used by the page wrapper. */
  color: string;
  fontFamily: string;
  warnings: string[];
}

/** Properties copied only when they differ from the parent's computed value (they inherit). */
const INHERITED = [
  "color", "font-family", "font-size", "font-style", "font-weight", "font-variant", "line-height",
  "letter-spacing", "text-align", "text-indent", "text-transform", "white-space", "word-break",
  "overflow-wrap", "tab-size", "list-style-type", "list-style-position", "visibility",
];

/** Properties copied unless they hold their initial value (see `isDefault`). */
const OWN = [
  "display", "background-color", "background-image", "background-size", "background-position",
  "background-repeat", "border-top-width", "border-top-style", "border-top-color", "border-right-width",
  "border-right-style", "border-right-color", "border-bottom-width", "border-bottom-style",
  "border-bottom-color", "border-left-width", "border-left-style", "border-left-color",
  "border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius",
  "border-bottom-right-radius", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "margin-top", "margin-right", "margin-bottom", "margin-left", "box-shadow", "text-decoration-line",
  "text-decoration-color", "text-decoration-style", "vertical-align", "opacity", "border-collapse",
  "border-spacing", "table-layout", "overflow-x", "overflow-y", "box-sizing", "float", "clear",
  "flex-direction", "align-items", "justify-content", "gap", "list-style-image", "position",
  "clip", "clip-path", "z-index", "transform", "flex-grow", "flex-shrink", "flex-basis", "align-self",
  "min-width", "min-height", "max-width", "max-height", "inset-block", "inset-inline",
];

/** Size is copied for positioned elements (e.g. visually-hidden labels are 1px boxes) and replaced elements. */
const POSITIONED = new Set(["absolute", "fixed", "sticky"]);

const DEFAULTS = new Set([
  "none", "normal", "0px", "rgba(0, 0, 0, 0)", "transparent", "auto", "visible", "baseline",
  "separate", "0px 0px", "initial", "repeat", "0% 0%", "row", "stretch", "flex-start", "static", "left",
  "none auto", "auto auto", "0px 0px 0px 0px",
]);

/** Initial values that are numbers: only meaningful for their own property (flex-grow 1 is NOT a default). */
const NUMERIC_DEFAULTS: Record<string, string> = { opacity: "1", "flex-grow": "0", "flex-shrink": "1", "z-index": "auto" };

function isDefault(prop: string, value: string): boolean {
  if (prop === "display" || prop === "box-sizing" || prop === "border-collapse") return false; // always keep
  if (prop in NUMERIC_DEFAULTS) return NUMERIC_DEFAULTS[prop] === value;
  return DEFAULTS.has(value);
}

const STRIPPED_ATTRS = ["class", "contenteditable", "draggable", "tabindex", "spellcheck", "translate", "id"];

const SIZED_TAGS = new Set(["IMG", "CANVAS", "VIDEO", "INPUT", "SVG", "TEXTAREA"]);

function inlineStyle(o: Element, c: Element, parent: Element | null) {
  const cs = getComputedStyle(o);
  const ps = parent ? getComputedStyle(parent) : null;
  const decl: string[] = [];
  for (const p of INHERITED) {
    const v = cs.getPropertyValue(p);
    if (v && (!ps || ps.getPropertyValue(p) !== v)) decl.push(`${p}:${v}`);
  }
  for (const p of OWN) {
    const v = cs.getPropertyValue(p);
    if (!v || isDefault(p, v)) continue;
    // a border is only visible with a style: skip its colour/width when there is none
    if (p.endsWith("-color") && p.startsWith("border-") && cs.getPropertyValue(p.replace("-color", "-style")) === "none") continue;
    decl.push(`${p}:${v}`);
  }
  if (SIZED_TAGS.has(o.tagName.toUpperCase()) || POSITIONED.has(cs.position)) {
    const r = o.getBoundingClientRect();
    if (r.width) decl.push(`width:${Math.round(r.width * 100) / 100}px`);
    if (r.height) decl.push(`height:${Math.round(r.height * 100) / 100}px`);
  }
  if (decl.length) c.setAttribute("style", decl.join(";"));
}

const toBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

async function toDataUri(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  const res = await fetch(src);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return `data:${blob.type || "application/octet-stream"};base64,${toBase64(bytes)}`;
}

/** A Mermaid diagram as a standalone SVG image (data URI) with its on-screen size. */
export function svgToImage(svg: SVGSVGElement, doc: Document): HTMLImageElement {
  const r = svg.getBoundingClientRect();
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", String(Math.ceil(r.width)));
  copy.setAttribute("height", String(Math.ceil(r.height)));
  copy.removeAttribute("style");
  const xml = new XMLSerializer().serializeToString(copy);
  const img = doc.createElement("img");
  img.setAttribute("src", `data:image/svg+xml;base64,${toBase64(new TextEncoder().encode(xml))}`);
  img.setAttribute("alt", "Diagrama");
  img.setAttribute("style", `display:block;margin:0 auto;width:${Math.ceil(r.width)}px;height:${Math.ceil(r.height)}px`);
  return img;
}

/** Walks the original and the clone in lockstep so computed styles come from the live element. */
function copyTree(o: Element, c: Element, doc: Document, pending: Promise<void>[], warnings: string[], root: Element = o) {
  if (o.tagName.toLowerCase() === "svg") return; // handled by the caller (Mermaid) or kept as is
  // the root has no parent in the exported page, so it carries every inherited property explicitly
  inlineStyle(o, c, o === root ? null : o.parentElement);

  if (o instanceof HTMLInputElement && o.type === "checkbox") {
    if (o.checked) c.setAttribute("checked", "checked");
    else c.removeAttribute("checked");
    c.setAttribute("disabled", "disabled");
  }
  // every visual is inline: classes would only let page stylesheets change measurement or rendering
  for (const attr of STRIPPED_ATTRS) c.removeAttribute(attr);

  const oc = Array.from(o.children);
  const cc = Array.from(c.children);
  for (let i = 0; i < oc.length; i++) {
    const oChild = oc[i];
    const cChild = cc[i];
    if (!cChild) continue;
    if (oChild.tagName.toLowerCase() === "svg") {
      const img = svgToImage(oChild as SVGSVGElement, doc);
      cChild.replaceWith(img);
      continue;
    }
    if (oChild instanceof HTMLImageElement) {
      inlineStyle(oChild, cChild, o);
      for (const attr of STRIPPED_ATTRS) cChild.removeAttribute(attr);
      const img = cChild as HTMLImageElement;
      const src = oChild.currentSrc || oChild.src;
      if (src && !src.startsWith("data:")) {
        pending.push(
          toDataUri(src)
            .then((uri) => img.setAttribute("src", uri))
            .catch(() => {
              warnings.push(`Imagen omitida: ${oChild.getAttribute("alt") || src}`);
              const span = doc.createElement("span");
              span.setAttribute("style", "font-style:italic;opacity:.7");
              span.textContent = `[${oChild.getAttribute("alt") || "imagen"}]`;
              img.replaceWith(span);
            }),
        );
      }
      continue;
    }
    copyTree(oChild, cChild, doc, pending, warnings, root);
  }
}

export async function snapshotContent(content: HTMLElement, background: HTMLElement): Promise<Snapshot> {
  const doc = content.ownerDocument;
  const clone = content.cloneNode(true) as HTMLElement;
  const pending: Promise<void>[] = [];
  const warnings: string[] = [];

  copyTree(content, clone, doc, pending, warnings);
  await Promise.all(pending);
  // a block-level image (direct child of the content) sits in an anonymous line box whose height depends on
  // the font; making it a block keeps its geometry identical in the layout probe and in the rendered page
  for (const k of Array.from(clone.children)) {
    if (k.tagName === "IMG") k.setAttribute("style", `${k.getAttribute("style") ?? ""};display:block`);
  }
  // the wrapper page provides margins and background: the content box itself must not add its own
  clone.style.cssText += ";display:flow-root;margin:0;padding:0;border:0;background:transparent;outline:0;box-shadow:none;width:auto;min-height:0";
  for (const trailing of Array.from(clone.querySelectorAll(".ProseMirror-trailingBreak, .ProseMirror-gapcursor"))) trailing.remove();

  const bg = getComputedStyle(background);
  const cs = getComputedStyle(content);
  const backgroundCss = [
    `background-color:${bg.backgroundColor}`,
    bg.backgroundImage !== "none" ? `background-image:${bg.backgroundImage}` : "",
    bg.backgroundImage !== "none" ? `background-size:${bg.backgroundSize};background-position:${bg.backgroundPosition};background-repeat:${bg.backgroundRepeat}` : "",
  ]
    .filter(Boolean)
    .join(";");
  return {
    html: new XMLSerializer().serializeToString(clone),
    backgroundCss,
    color: cs.color,
    fontFamily: cs.fontFamily,
    warnings,
  };
}
