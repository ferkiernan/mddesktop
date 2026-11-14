// Spec 005: PDF pagination never cuts through a line, keeps 2+ lines on each side and repeats table headers.
import { describe, expect, it } from "vitest";
import { paginate, type Block, type TableInfo } from "../../src/features/export/paginate";
import { exportStyleOptions, resolveExportStyle, SCREEN_STYLE } from "../../src/features/export/exportStyles";

const lines = (n: number, h: number, start = 0): Block[] =>
  Array.from({ length: n }, (_, i) => ({ top: start + i * h, bottom: start + (i + 1) * h, keepWithNext: n >= 4 && (i === 0 || i === n - 2) }));

describe("paginate (spec 005)", () => {
  it("cuts a tall paragraph only between lines", () => {
    const blocks = lines(30, 20); // 600 px of 20 px lines
    const slices = paginate(blocks, 600, 250);
    const bottoms = new Set(blocks.map((b) => b.bottom));
    for (const s of slices.slice(0, -1)) expect(bottoms.has(s.top + s.height)).toBe(true);
    expect(slices.reduce((n, s) => n + s.height, 0)).toBe(600);
  });

  it("never leaves a single line of a paragraph alone at either side of a cut", () => {
    // a 5-line paragraph straddling the page end: cutting after line 1 or line 4 would orphan/widow a line
    const before: Block = { top: 0, bottom: 165, keepWithNext: false };
    const para = lines(5, 20, 165); // 165..265
    const slices = paginate([before, ...para], 265, 190); // the page could hold before + 1 line (185)
    const cut = slices[0].top + slices[0].height;
    expect(cut).not.toBe(185); // not after the first line
    expect([165, 205, 225]).toContain(cut);
  });

  it("repeats the table header on continuation pages and reduces the room accordingly", () => {
    const header: Block = { top: 0, bottom: 30, keepWithNext: true };
    const rows: Block[] = Array.from({ length: 30 }, (_, i) => ({ top: 30 + i * 30, bottom: 60 + i * 30 }));
    const table: TableInfo = { top: 0, bottom: 930, headerBottom: 30, headerHeight: 30, headerHtml: "<table/>" };
    const slices = paginate([header, ...rows], 930, 300, [table]);
    expect(slices[0].header).toBeUndefined();
    for (const s of slices.slice(1)) {
      expect(s.header?.height).toBe(30);
      expect(s.height).toBeLessThanOrEqual(270);
    }
    const rowBottoms = new Set(rows.map((r) => r.bottom));
    for (const s of slices.slice(0, -1)) expect(rowBottoms.has(s.top + s.height)).toBe(true); // never inside a row
  });
});

describe("export styles (spec 005)", () => {
  it("offers 'Como en pantalla' first, then every style; unknown ids fall back to it", () => {
    const opts = exportStyleOptions();
    expect(opts[0]).toMatchObject({ id: SCREEN_STYLE, label: "Como en pantalla" });
    expect(opts[0].vars).toBeUndefined();
    expect(opts.map((o) => o.id)).toContain("winamp");
    expect(resolveExportStyle("does-not-exist").id).toBe(SCREEN_STYLE);
    expect(resolveExportStyle("dark").vars?.["--mdw-bg"]).toBe("#0b1220");
  });
});
