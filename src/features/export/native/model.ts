// Rendered viewer DOM -> structured document for the native Word/ODT writers (spec 006). Text, structure and
// formatting come from the document; colours and fonts are the browser's computed values for the export style.
// Only pictures (images, Mermaid diagrams) become images.
import { CONTENT_HEIGHT_PX, CONTENT_WIDTH_PX } from "../constants";
import { svgToImage } from "../snapshot";
import { commonFont, hex, parseColor, readable, type Rgb } from "./color";

export interface Pic {
  data: Uint8Array;
  ext: "png" | "jpeg" | "gif";
  /** Display size in CSS px (already fitted to the page). */
  width: number;
  height: number;
  alt: string;
}

export interface Run {
  text?: string;
  br?: true;
  pic?: Pic;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: string;
  /** Hex colour (no #) when it differs from the body text colour. */
  color?: string;
  /** Background (inline code). */
  shade?: string;
  font?: string;
  /** Font size in points when it differs from the body size. */
  sizePt?: number;
}

export type Block =
  | { type: "heading"; level: number; runs: Run[] }
  | { type: "para"; runs: Run[] }
  | { type: "list"; ordered: boolean; start: number; items: ListItem[] }
  | { type: "quote"; blocks: Block[] }
  | { type: "code"; lines: Run[][] }
  | { type: "table"; align: ("left" | "center" | "right")[]; rows: { header: boolean; cells: Run[][] }[] }
  | { type: "hr" };

export interface ListItem {
  /** Task items: checked state; undefined for normal items. */
  checked?: boolean;
  blocks: Block[];
}

export interface Theme {
  fg: string;
  bg: string;
  dark: boolean;
  font: string;
  mono: string;
  sizePt: number;
  link: string;
  codeBg: string;
  codeFg: string;
  quoteFg: string;
  quoteBorder: string;
  border: string;
  headerBg: string;
}

export interface NativeDoc {
  title: string;
  theme: Theme;
  blocks: Block[];
  warnings: string[];
}

const pt = (px: number) => Math.round(px * 0.75 * 2) / 2;
const SKIP = new Set(["SCRIPT", "STYLE", "TEMPLATE", "BUTTON", "INPUT", "LABEL"]);

async function bytesOf(url: string): Promise<{ data: Uint8Array; type: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return { data: new Uint8Array(await blob.arrayBuffer()), type: blob.type };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("imagen no válida"));
    img.src = src;
  });
}

/** Draws any image the WebView can show into a PNG (SVG, WebP, Mermaid...), at 2x for sharpness. */
async function toPng(src: string, w: number, h: number): Promise<Uint8Array> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * 2));
  canvas.height = Math.max(1, Math.round(h * 2));
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas no disponible");
  g.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("No se pudo convertir la imagen");
  return new Uint8Array(await blob.arrayBuffer());
}

function fitSize(w: number, h: number, warnings: string[], what: string): { width: number; height: number } {
  const scale = Math.min(1, CONTENT_WIDTH_PX / w, CONTENT_HEIGHT_PX / h);
  if (scale < 0.5) warnings.push(`${what} reducido al ${Math.round(scale * 100)} % para caber en la página`);
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

async function picFromImg(img: HTMLImageElement, warnings: string[]): Promise<Pic | null> {
  const alt = img.getAttribute("alt") ?? "";
  const r = img.getBoundingClientRect();
  const w = r.width || img.naturalWidth || 100;
  const h = r.height || img.naturalHeight || 100;
  const size = fitSize(w, h, warnings, `Imagen "${alt || "sin texto alternativo"}"`);
  const src = img.currentSrc || img.src;
  try {
    const { data, type } = await bytesOf(src);
    if (/png/.test(type)) return { data, ext: "png", alt, ...size };
    if (/jpe?g/.test(type)) return { data, ext: "jpeg", alt, ...size };
    if (/gif/.test(type)) return { data, ext: "gif", alt, ...size };
    return { data: await toPng(src, size.width, size.height), ext: "png", alt, ...size };
  } catch {
    warnings.push(`Imagen omitida: ${alt || src}`);
    return null;
  }
}

async function picFromSvg(svg: SVGSVGElement, warnings: string[]): Promise<Pic | null> {
  const r = svg.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const img = svgToImage(svg, svg.ownerDocument);
  const size = fitSize(r.width, r.height, warnings, "Diagrama");
  try {
    return { data: await toPng(img.getAttribute("src")!, size.width, size.height), ext: "png", alt: "Diagrama", ...size };
  } catch {
    warnings.push("Diagrama omitido: no se pudo convertir a imagen");
    return null;
  }
}

export async function buildModel(content: HTMLElement, title: string, pageBg: string): Promise<NativeDoc> {
  const warnings: string[] = [];
  const view = content.ownerDocument.defaultView!;
  const cs = (el: Element) => view.getComputedStyle(el);
  const base = cs(content);
  const bgRgb = parseColor(pageBg) ?? [255, 255, 255];
  const fgRgb = readable(parseColor(base.color) ?? [0, 0, 0], bgRgb);
  const bodySize = pt(parseFloat(base.fontSize) || 16);
  const font = commonFont(base.fontFamily);

  // representative colours (first element of each kind, else derived)
  const pick = (sel: string, prop: "color" | "backgroundColor" | "borderLeftColor"): Rgb | null => {
    const el = content.querySelector(sel);
    return el ? parseColor(cs(el)[prop]) : null;
  };
  const codeBgRgb = pick("pre", "backgroundColor") ?? bgRgb;
  const theme: Theme = {
    fg: hex(fgRgb),
    bg: hex(bgRgb),
    dark: (bgRgb[0] + bgRgb[1] + bgRgb[2]) / 3 < 100,
    font,
    mono: commonFont(cs(content.querySelector("code") ?? content).fontFamily, true),
    sizePt: bodySize,
    link: hex(readable(pick("a", "color") ?? [5, 99, 193], bgRgb)),
    codeBg: hex(codeBgRgb),
    codeFg: hex(readable(pick("pre", "color") ?? fgRgb, codeBgRgb)),
    quoteFg: hex(readable(pick("blockquote", "color") ?? fgRgb, bgRgb)),
    quoteBorder: hex(pick("blockquote", "borderLeftColor") ?? [200, 200, 200]),
    border: hex(parseColor(content.querySelector("td,th") ? cs(content.querySelector("td,th")!).borderTopColor : "") ?? [200, 200, 200]),
    headerBg: hex(pick("th", "backgroundColor") ?? bgRgb),
  };

  /** Run formatting from the computed style of the text's parent element. */
  const fmt = (el: Element, bgFor: Rgb): Omit<Run, "text"> => {
    const s = cs(el);
    const run: Omit<Run, "text"> = {};
    if (parseInt(s.fontWeight, 10) >= 600) run.bold = true;
    if (s.fontStyle === "italic") run.italic = true;
    if (/line-through/.test(s.textDecorationLine)) run.strike = true;
    const c = parseColor(s.color);
    if (c) {
      const fixed = hex(readable(c, bgFor));
      if (fixed !== theme.fg) run.color = fixed;
    }
    const f = commonFont(s.fontFamily);
    if (f !== font) run.font = f;
    const size = pt(parseFloat(s.fontSize) || 16);
    if (Math.abs(size - bodySize) >= 0.5) run.sizePt = size;
    return run;
  };

  async function inline(el: Element, bgFor: Rgb, link?: string, inCode = false): Promise<Run[]> {
    const runs: Run[] = [];
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? "";
        if (!text) continue;
        const parent = node.parentElement ?? el;
        const run: Run = { text, ...fmt(parent, bgFor) };
        if (link) run.link = link;
        if (inCode || parent.closest("code")) run.code = true;
        if (run.code && !inCode) {
          const sh = parseColor(cs(parent.closest("code")!).backgroundColor);
          if (sh) run.shade = hex(sh);
        }
        runs.push(run);
      } else if (node instanceof view.HTMLElement || node instanceof view.SVGElement) {
        const child = node as Element;
        if (SKIP.has(child.tagName) || child.classList.contains("ProseMirror-trailingBreak")) continue;
        if (child.tagName === "BR") runs.push({ br: true });
        else if (child.tagName === "IMG") {
          const pic = await picFromImg(child as HTMLImageElement, warnings);
          runs.push(pic ? { pic, ...(link ? { link } : {}) } : { text: `[${child.getAttribute("alt") || "imagen"}]`, italic: true });
        } else if (child.tagName.toLowerCase() === "svg") {
          const pic = await picFromSvg(child as SVGSVGElement, warnings);
          if (pic) runs.push({ pic });
        } else {
          const href = child.tagName === "A" ? (child as HTMLAnchorElement).getAttribute("href") ?? undefined : link;
          runs.push(...(await inline(child, bgFor, href, inCode)));
        }
      }
    }
    return runs;
  }

  async function codeLines(pre: Element): Promise<Run[][]> {
    const runs = await inline(pre, codeBgRgb, undefined, true);
    const lines: Run[][] = [[]];
    for (const r of runs) {
      if (r.br) {
        lines.push([]);
        continue;
      }
      const parts = (r.text ?? "").split("\n");
      parts.forEach((p, i) => {
        if (i > 0) lines.push([]);
        if (p) lines[lines.length - 1].push({ ...r, text: p, code: true, font: undefined, sizePt: undefined });
      });
    }
    if (lines.length > 1 && lines[lines.length - 1].length === 0) lines.pop();
    return lines;
  }

  const isInlineOnly = (el: Element) =>
    Array.from(el.children).every((c) => /^(inline|inline-block|contents|none)$/.test(cs(c).display) || c.tagName === "BR" || c.tagName === "IMG");

  async function blocks(el: Element): Promise<Block[]> {
    const out: Block[] = [];
    for (const child of Array.from(el.children)) {
      const tag = child.tagName;
      if (SKIP.has(tag) || cs(child).display === "none") continue;
      if (/^H[1-6]$/.test(tag)) out.push({ type: "heading", level: +tag[1], runs: await inline(child, bgRgb) });
      else if (tag === "P") out.push({ type: "para", runs: await inline(child, bgRgb) });
      else if (tag === "HR") out.push({ type: "hr" });
      else if (tag === "PRE") out.push({ type: "code", lines: await codeLines(child) });
      else if (tag === "BLOCKQUOTE") out.push({ type: "quote", blocks: await blocks(child) });
      else if (tag === "UL" || tag === "OL") {
        const items: ListItem[] = [];
        for (const li of Array.from(child.children).filter((c) => c.tagName === "LI")) {
          // task items: Tiptap marks them in different ways depending on the view (data-type, data-checked, checkbox)
          const box = (li.querySelector(":scope > label input[type=checkbox]") ?? li.querySelector(":scope > input[type=checkbox]")) as HTMLInputElement | null;
          const task = li.getAttribute("data-type") === "taskItem" || li.hasAttribute("data-checked") || !!box || child.getAttribute("data-type") === "taskList";
          const body = task ? (li.querySelector(":scope > div") ?? li) : li;
          const inner = isInlineOnly(body) ? [{ type: "para" as const, runs: await inline(body, bgRgb) }] : await blocks(body);
          items.push({ ...(task ? { checked: box ? box.checked : li.getAttribute("data-checked") === "true" } : {}), blocks: inner });
        }
        out.push({ type: "list", ordered: tag === "OL", start: Number((child as HTMLOListElement).start || 1), items });
      } else if (tag === "TABLE") {
        const table = child as HTMLTableElement;
        const rows = [] as { header: boolean; cells: Run[][] }[];
        const align: ("left" | "center" | "right")[] = [];
        for (const tr of Array.from(table.rows)) {
          const cells: Run[][] = [];
          for (const [i, cell] of Array.from(tr.cells).entries()) {
            const a = cs(cell).textAlign;
            if (!align[i]) align[i] = a === "center" ? "center" : a === "right" || a === "end" ? "right" : "left";
            const bgCell = parseColor(cs(cell).backgroundColor) ?? bgRgb;
            const parts: Run[] = [];
            for (const p of Array.from(cell.children.length ? cell.children : [cell])) {
              if (parts.length) parts.push({ br: true });
              parts.push(...(await inline(p, bgCell)));
            }
            cells.push(parts);
          }
          rows.push({ header: Array.from(tr.cells).every((c) => c.tagName === "TH"), cells });
        }
        out.push({ type: "table", align, rows });
      } else if (child.hasAttribute("data-mermaid-block")) {
        const svg = child.querySelector("svg");
        if (svg) {
          const pic = await picFromSvg(svg, warnings);
          if (pic) out.push({ type: "para", runs: [{ pic }] });
        } else {
          const pre = child.querySelector("pre");
          warnings.push("Diagrama no dibujado: se incluye su código");
          if (pre) out.push({ type: "code", lines: await codeLines(pre) });
        }
      } else if (tag === "IMG") {
        const pic = await picFromImg(child as HTMLImageElement, warnings);
        if (pic) out.push({ type: "para", runs: [{ pic }] });
      } else if (isInlineOnly(child) && (child.textContent ?? "").trim()) {
        out.push({ type: "para", runs: await inline(child, bgRgb) });
      } else {
        out.push(...(await blocks(child))); // wrappers (table wrappers, node views, sections)
      }
    }
    return out;
  }

  return { title, theme, blocks: await blocks(content), warnings };
}
