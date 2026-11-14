// Makes the snapshot fit an A4 page before pagination (spec 005 US2): nothing may be clipped on the right and
// no picture may be taller than a page. Pictures and wide tables are scaled down proportionally; code wraps.
// Works on the isolated measuring document, whose layout equals the rendered pages.

const pct = (f: number) => `${Math.round(f * 100)} %`;

export function fitContent(root: HTMLElement, width: number, pageH: number): string[] {
  const warnings: string[] = [];

  // code: long lines wrap instead of running past the right edge
  for (const pre of Array.from(root.querySelectorAll("pre"))) {
    pre.style.whiteSpace = "pre-wrap";
    pre.style.overflowWrap = "anywhere";
    for (const el of Array.from(pre.querySelectorAll<HTMLElement>("*"))) {
      if (el.style.whiteSpace) el.style.whiteSpace = "pre-wrap";
    }
  }

  // pictures (images and Mermaid diagrams, which the snapshot turned into images)
  for (const img of Array.from(root.querySelectorAll("img"))) {
    const r = img.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    // the block that holds the picture (e.g. the diagram card) adds padding/margins: the whole block must fit
    let block: Element = img;
    while (block.parentElement && block.parentElement !== root) block = block.parentElement;
    const b = block.getBoundingClientRect();
    const extraH = Math.max(0, b.height - r.height) + 4;
    const scale = Math.min(1, width / r.width, Math.max(1, pageH - extraH) / r.height);
    if (scale < 0.999) {
      img.style.width = `${Math.floor(r.width * scale)}px`;
      img.style.height = `${Math.floor(r.height * scale)}px`;
      img.style.maxWidth = "100%";
      if (scale < 0.5) {
        const what = img.getAttribute("alt") === "Diagrama" ? "Diagrama" : `Imagen "${img.getAttribute("alt") || "sin texto alternativo"}"`;
        warnings.push(`${what} reducido al ${pct(scale)} para caber en la página`);
      }
    }
  }

  // tables wider than the page: scale the whole table (columns keep their proportions)
  for (const table of Array.from(root.querySelectorAll("table"))) {
    const w = Math.max(table.getBoundingClientRect().width, table.scrollWidth);
    if (w > width + 0.5) {
      const scale = width / w;
      table.style.setProperty("zoom", String(Math.floor(scale * 1000) / 1000));
      if (scale < 0.5) warnings.push(`Tabla reducida al ${pct(scale)} para caber en el ancho de la página`);
    }
  }

  // "normal" line heights depend on font metrics at the device scale, which differ between this measuring
  // document and the rasterized page: use an explicit pixel line height so both lay out identically
  const view = root.ownerDocument.defaultView;
  for (const el of [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]) {
    const s = view?.getComputedStyle(el);
    if (s && s.lineHeight === "normal" && el.tagName !== "IMG") el.style.lineHeight = `${Math.round(parseFloat(s.fontSize) * 1.25)}px`;
  }

  // table rows: pin their measured height (whole pixels). Rows have no margins between them, so sub-pixel
  // differences between this layout and the rendered page would add up row after row and move the cuts.
  for (const tr of Array.from(root.querySelectorAll("tr"))) {
    tr.style.height = `${Math.ceil(tr.getBoundingClientRect().height)}px`;
  }

  // anything else still wider (long words, URLs): let it wrap
  for (const el of Array.from(root.children) as HTMLElement[]) {
    if (el.scrollWidth > width + 0.5 && el.tagName !== "TABLE") el.style.overflowWrap = "anywhere";
  }

  // top-level blocks: pin their measured height so nothing above a cut can shift the content below it
  for (const el of Array.from(root.children) as HTMLElement[]) {
    if (el.tagName === "IMG") continue;
    const h = el.getBoundingClientRect().height;
    el.style.boxSizing = "border-box";
    el.style.height = `${h}px`;
  }

  return warnings;
}
