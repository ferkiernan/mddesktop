// A4 pagination (spec 002 FR-006, spec 005 US2): a block that fits on a page is never split; a taller block is
// cut between its rows or rendered lines (never through a line), keeping at least two lines of a paragraph on
// each side; headings travel with what follows; long tables repeat their header row on continuation pages.

export interface Block {
  top: number;
  bottom: number;
  /** Never cut right after this block (headings, table header rows, orphan/widow lines). */
  keepWithNext?: boolean;
}

export interface TableInfo {
  top: number;
  bottom: number;
  /** Bottom of the header row; continuation pages that start below it repeat the header. */
  headerBottom: number;
  headerHeight: number;
  /** Self-contained markup of the header (a one-row table with the measured column widths). */
  headerHtml: string;
}

export interface PageSlice {
  index: number;
  /** Start offset in the content (px) and height of this slice. */
  top: number;
  height: number;
  /** Pixels that may be shown below the cut: only blank space up to the next block (never the next row/line). */
  slack?: number;
  /** Repeated table header drawn above the slice. */
  header?: { html: string; height: number };
}

/**
 * @param blocks  vertical extents of the breakable blocks, relative to the content
 * @param total   full content height
 * @param pageH   usable page height
 * @param tables  long tables whose header must repeat
 */
export function paginate(blocks: Block[], total: number, pageH: number, tables: TableInfo[] = []): PageSlice[] {
  const slices: PageSlice[] = [];
  const sorted = [...blocks].sort((a, b) => a.bottom - b.bottom);
  let start = 0;
  while (start < total - 0.5) {
    const table = tables.find((t) => start >= t.headerBottom - 0.5 && start < t.bottom - 0.5 && t.headerHeight < pageH / 2);
    const header = table ? { html: table.headerHtml, height: table.headerHeight } : undefined;
    const room = pageH - (header?.height ?? 0);
    const limit = start + room;
    let cut: number;
    if (total <= limit + 0.5) {
      cut = total;
    } else {
      // the last block boundary that still fits on this page, skipping blocks that must stay with the next one
      const fitting = sorted.filter((b) => b.bottom > start + 1 && b.bottom <= limit + 0.5);
      let i = fitting.length - 1;
      while (i >= 0 && fitting[i].keepWithNext) i--;
      if (i >= 0) cut = fitting[i].bottom;
      else cut = fitting.length ? fitting[fitting.length - 1].bottom : limit; // nothing breakable: cut at the limit
    }
    const nextTop = Math.min(total, ...sorted.filter((b) => b.top >= cut - 0.5).map((b) => b.top));
    const slack = Math.max(0, Math.min(12, nextTop - cut - 1));
    slices.push({ index: slices.length, top: start, height: cut - start, slack, ...(header ? { header } : {}) });
    start = cut;
  }
  if (slices.length === 0) slices.push({ index: 0, top: 0, height: Math.min(total, pageH) });
  return slices;
}

const BLOCKISH = /^(block|flex|grid|table|table-row|table-row-group|table-header-group|table-footer-group|list-item|flow-root)$/;

function hasBlockChildren(el: Element): boolean {
  const view = el.ownerDocument.defaultView;
  return Array.from(el.children).some((c) => BLOCKISH.test(view?.getComputedStyle(c).display ?? ""));
}

/** Rendered lines of an element with inline content, as blocks (top/bottom relative to `base`). */
export function lineBlocks(el: Element, base: number): Block[] {
  const range = el.ownerDocument.createRange();
  range.selectNodeContents(el);
  const rects = Array.from(range.getClientRects()).filter((r) => r.height > 0 && r.width > 0);
  rects.sort((a, b) => a.top - b.top);
  const lines: { top: number; bottom: number }[] = [];
  for (const r of rects) {
    const last = lines[lines.length - 1];
    // same line when the boxes overlap vertically by more than half of the smaller one
    if (last && Math.min(last.bottom, r.bottom) - Math.max(last.top, r.top) > Math.min(last.bottom - last.top, r.height) / 2) {
      last.top = Math.min(last.top, r.top);
      last.bottom = Math.max(last.bottom, r.bottom);
    } else {
      lines.push({ top: r.top, bottom: r.bottom });
    }
  }
  const n = lines.length;
  return lines.map((l, i) => ({
    top: l.top - base,
    bottom: l.bottom - base,
    // at least two lines on each side of a cut (no orphan/widow) when the paragraph has 4+ lines
    keepWithNext: n >= 4 && (i === 0 || i === n - 2),
  }));
}

function headerMarkup(table: HTMLTableElement, row: HTMLTableRowElement): string {
  const doc = table.ownerDocument;
  const t = doc.createElement("table");
  t.setAttribute("style", `${table.getAttribute("style") ?? ""};width:${table.offsetWidth}px;table-layout:fixed;margin:0`);
  const cols = doc.createElement("colgroup");
  for (const cell of Array.from(row.cells)) {
    const col = doc.createElement("col");
    col.setAttribute("style", `width:${cell.offsetWidth}px`);
    cols.appendChild(col);
  }
  t.appendChild(cols);
  const body = doc.createElement("tbody");
  body.appendChild(row.cloneNode(true));
  t.appendChild(body);
  return new XMLSerializer().serializeToString(t);
}

/**
 * Break candidates of a rendered content element: its children; children taller than a page are opened up
 * (table rows, list items, nested blocks) and, when their content is inline, split into rendered lines.
 * Long tables are reported in `tables` so their header row can be repeated.
 */
export function collectBlocks(root: HTMLElement, pageH: number, tables: TableInfo[] = []): Block[] {
  const base = root.getBoundingClientRect().top;
  const out: Block[] = [];
  const visit = (el: Element) => {
    for (const child of Array.from(el.children)) {
      const r = child.getBoundingClientRect();
      const top = r.top - base;
      const bottom = r.bottom - base;
      if (r.height <= 0) continue;
      if (r.height <= pageH) {
        out.push({ top, bottom, keepWithNext: /^H[1-6]$/.test(child.tagName) });
        continue;
      }
      if (child.tagName === "TABLE") {
        const table = child as HTMLTableElement;
        const first = table.rows[0];
        if (first && Array.from(first.cells).every((c) => c.tagName === "TH")) {
          const hr = first.getBoundingClientRect();
          tables.push({ top, bottom, headerBottom: hr.bottom - base, headerHeight: hr.height, headerHtml: headerMarkup(table, first) });
          out.push({ top: hr.top - base, bottom: hr.bottom - base, keepWithNext: true }); // never a page with only the header
        }
        visitRows(table);
      } else if (child.tagName === "TR") {
        for (const cell of Array.from((child as HTMLTableRowElement).cells)) out.push(...lineBlocks(cell, base));
      } else if (hasBlockChildren(child)) {
        visit(child);
      } else {
        out.push(...lineBlocks(child, base));
      }
    }
  };
  const visitRows = (table: HTMLTableElement) => {
    for (const row of Array.from(table.rows)) {
      const r = row.getBoundingClientRect();
      if (r.height <= pageH) out.push({ top: r.top - base, bottom: r.bottom - base });
      else for (const cell of Array.from(row.cells)) out.push(...lineBlocks(cell, base));
    }
  };
  visit(root);
  return out;
}
