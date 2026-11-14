// Page rasterizer: each A4 page is drawn as an SVG <foreignObject> holding the snapshot markup,
// loaded as an image and painted on a canvas (spike R3: works untainted in WebView2). Everything is
// inlined (styles, images, SVG), so the result is exactly what the viewer shows.
import {
  A4,
  CONTENT_HEIGHT_PX,
  CONTENT_WIDTH_PX,
  JPEG_QUALITY,
  RASTER_HEIGHT_PX,
  RASTER_WIDTH_PX,
} from "./constants";
import { fitContent } from "./fit";
import { collectBlocks, paginate, type PageSlice, type TableInfo } from "./paginate";
import type { Snapshot } from "./snapshot";

export interface RenderedPage {
  index: number;
  jpeg: Uint8Array;
  width: number;
  height: number;
}

export interface Layout {
  slices: PageSlice[];
  /** The snapshot markup after fitting it to the page (what is measured is what is drawn). */
  html: string;
  warnings: string[];
}

const nextFrame = () => new Promise<void>((r) => setTimeout(r, 0)); // yield so the UI stays responsive

/**
 * Extra pixels shown below each cut. The layout probe and the final render can differ by a few
 * sub-pixels; the cut sits at a block boundary, so the slack only reveals the blank margin that
 * follows the block (never the next block, whose margin is larger) and prevents clipping its last line.
 * Cuts between rendered lines use the line box, which already includes the line's leading.
 */
const CUT_SLACK_PX = 12;

function pageSvg(snap: Snapshot, html: string, slice: PageSlice): string {
  const headerH = slice.header?.height ?? 0;
  const visible = Math.min(slice.height + Math.min(CUT_SLACK_PX, slice.slack ?? CUT_SLACK_PX), CONTENT_HEIGHT_PX - headerH);
  const style = `box-sizing:border-box;position:relative;overflow:hidden;width:${A4.widthPx}px;height:${A4.heightPx}px;${snap.backgroundCss};color:${snap.color};font-family:${snap.fontFamily.replace(/"/g, "'")}`;
  const header = slice.header
    ? `<div style="width:${CONTENT_WIDTH_PX}px;height:${headerH}px;overflow:hidden">${slice.header.html}</div>`
    : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${A4.widthPx}" height="${A4.heightPx}">` +
    `<foreignObject x="0" y="0" width="${A4.widthPx}" height="${A4.heightPx}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="${style}">` +
    `<div style="position:absolute;left:${A4.marginPx}px;top:${A4.marginPx}px;width:${CONTENT_WIDTH_PX}px">` +
    header +
    `<div style="position:relative;width:${CONTENT_WIDTH_PX}px;height:${visible}px;overflow:hidden">` +
    `<div style="position:relative;top:${-slice.top}px;width:${CONTENT_WIDTH_PX}px">${html}</div>` +
    `</div></div></div></foreignObject></svg>`
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo dibujar la página"));
    img.src = url;
  });
}

/**
 * Fits the snapshot to the page and returns the page slices. Measured inside an isolated iframe document:
 * like the SVG foreignObject used for rendering, it has no page stylesheets and standards-mode defaults, so
 * the measured heights equal the rendered ones.
 */
export async function layoutPages(snap: Snapshot): Promise<Layout> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${CONTENT_WIDTH_PX}px;height:200px;border:0;visibility:hidden`;
  const loaded = new Promise<void>((resolve) => frame.addEventListener("load", () => resolve(), { once: true }));
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><div style="width:${CONTENT_WIDTH_PX}px;position:relative">${snap.html}</div></body></html>`;
  document.body.appendChild(frame);
  try {
    await loaded;
    const doc = frame.contentDocument;
    const content = doc?.body.firstElementChild?.firstElementChild as HTMLElement | null | undefined;
    if (!doc || !content) return { slices: paginate([], 0, CONTENT_HEIGHT_PX), html: snap.html, warnings: [] };
    await Promise.all(
      Array.from(doc.images).map((img) =>
        img.complete ? undefined : new Promise<void>((r) => ((img.onload = img.onerror = () => r()), undefined)),
      ),
    );
    const warnings = fitContent(content, CONTENT_WIDTH_PX, CONTENT_HEIGHT_PX);
    const total = content.getBoundingClientRect().height;
    const tables: TableInfo[] = [];
    const blocks = collectBlocks(content, CONTENT_HEIGHT_PX, tables);
    return {
      slices: paginate(blocks, total, CONTENT_HEIGHT_PX, tables),
      html: new XMLSerializer().serializeToString(content),
      warnings,
    };
  } finally {
    frame.remove();
  }
}

async function renderPage(snap: Snapshot, html: string, slice: PageSlice): Promise<RenderedPage> {
  const img = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(pageSvg(snap, html, slice)));
  const canvas = document.createElement("canvas");
  canvas.width = RASTER_WIDTH_PX;
  canvas.height = RASTER_HEIGHT_PX;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas no disponible");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error("No se pudo codificar la página");
  return { index: slice.index, jpeg: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height };
}

/** Renders every A4 page, reporting progress and yielding between pages; stops when `signal` is cancelled. */
export async function renderPages(
  snap: Snapshot,
  onProgress?: (page: number, pages: number) => void,
  signal?: { cancelled: boolean },
): Promise<{ pages: RenderedPage[]; warnings: string[] }> {
  const layout = await layoutPages(snap);
  const pages: RenderedPage[] = [];
  for (const slice of layout.slices) {
    if (signal?.cancelled) throw new Error("Exportación cancelada");
    onProgress?.(slice.index + 1, layout.slices.length);
    await nextFrame();
    pages.push(await renderPage(snap, layout.html, slice));
  }
  return { pages, warnings: layout.warnings };
}
