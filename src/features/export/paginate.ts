// A4 pagination in block boundaries: a block that fits on a page is never split (spec FR-006);
// a block taller than the usable area is cut at the page limit.

export interface Block {
  top: number;
  bottom: number;
  /** Headings: never left alone at the bottom of a page. */
  keepWithNext?: boolean;
}

export interface PageSlice {
  index: number;
  /** Start offset in the content (px) and height of this slice. */
  top: number;
  height: number;
}

/**
 * @param blocks  vertical extents of the breakable blocks (sorted by `top`), relative to the content
 * @param total   full content height
 * @param pageH   usable page height
 */
export function paginate(blocks: Block[], total: number, pageH: number): PageSlice[] {
  const slices: PageSlice[] = [];
  const sorted = [...blocks].sort((a, b) => a.bottom - b.bottom);
  let start = 0;
  // guard against zero-progress loops
  while (start < total - 0.5) {
    const limit = start + pageH;
    let cut: number;
    if (total <= limit + 0.5) {
      cut = total;
    } else {
      // the last block boundary that still fits on this page (skipping trailing headings)
      const fitting = sorted.filter((b) => b.bottom > start + 1 && b.bottom <= limit + 0.5);
      let i = fitting.length - 1;
      while (i >= 0 && fitting[i].keepWithNext) i--; // a heading must travel with what follows it
      if (i >= 0) cut = fitting[i].bottom;
      else cut = fitting.length ? fitting[fitting.length - 1].bottom : limit; // only headings / one huge block
    }
    slices.push({ index: slices.length, top: start, height: cut - start });
    start = cut;
  }
  if (slices.length === 0) slices.push({ index: 0, top: 0, height: Math.min(total, pageH) });
  return slices;
}

/**
 * Break candidates of a rendered content element: its children, descending into children taller
 * than a page (table rows, list items) so very large blocks can still be cut between rows.
 */
export function collectBlocks(root: HTMLElement, pageH: number): Block[] {
  const base = root.getBoundingClientRect().top;
  const out: Block[] = [];
  const visit = (el: Element) => {
    for (const child of Array.from(el.children)) {
      const r = child.getBoundingClientRect();
      const top = r.top - base;
      const bottom = r.bottom - base;
      if (r.height > pageH && child.children.length > 0) {
        visit(child);
      } else if (r.height > 0) {
        out.push({ top, bottom, keepWithNext: /^H[1-6]$/.test(child.tagName) });
      }
    }
  };
  visit(root);
  return out;
}
