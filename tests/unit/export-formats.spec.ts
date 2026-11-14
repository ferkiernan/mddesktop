import { describe, expect, it } from "vitest";
import { paginate, type Block } from "../../src/features/export/paginate";
import { buildPdf } from "../../src/features/export/pdf";
import { buildDocx, documentXml } from "../../src/features/export/docx";
import { buildOdt, contentXml } from "../../src/features/export/odt";
import { crc32, createZip, readZip } from "../../src/features/export/zip";
import { buildHtmlPage } from "../../src/features/export/htmlPage";
import { toBase64 } from "../../src/features/export/exportDocument";

// a tiny but real JPEG (1x1) so parsers see plausible image bytes
const JPEG = Uint8Array.from(
  atob("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=")
    .split("")
    .map((c) => c.charCodeAt(0)),
);
const pages = (n: number) => Array.from({ length: n }, () => ({ jpeg: JPEG, width: 1588, height: 2246 }));
const parse = (xml: string) => new DOMParser().parseFromString(xml, "application/xml");
const text = (b: Uint8Array) => new TextDecoder().decode(b);

describe("zip writer", () => {
  it("crc32 matches the standard check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("round-trips entries, stored (method 0) with correct CRCs and a central directory", () => {
    const zip = createZip([
      { name: "a.txt", data: new TextEncoder().encode("hola") },
      { name: "dir/ñ.bin", data: Uint8Array.from([1, 2, 3, 255]) },
    ]);
    expect(Array.from(zip.subarray(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const entries = readZip(zip);
    expect(entries.map((e) => e.name)).toEqual(["a.txt", "dir/ñ.bin"]);
    expect(entries.every((e) => e.method === 0)).toBe(true);
    expect(text(entries[0].data)).toBe("hola");
    expect(Array.from(entries[1].data)).toEqual([1, 2, 3, 255]);
    for (const e of entries) expect(crc32(e.data)).toBe(e.crc);
    expect(entries[1].flags & 0x0800).toBe(0x0800); // non-ASCII name flagged as UTF-8
  });
});

describe("A4 pagination in block boundaries", () => {
  const blocks = (...pairs: [number, number][]): Block[] => pairs.map(([top, bottom]) => ({ top, bottom }));

  it("a short document is one page of exactly its height", () => {
    expect(paginate(blocks([0, 100], [120, 300]), 300, 1009)).toMatchObject([{ index: 0, top: 0, height: 300 }]);
  });

  it("never splits a block that fits: the cut moves to the previous boundary", () => {
    const s = paginate(blocks([0, 400], [420, 900], [920, 1300]), 1300, 1009);
    expect(s).toHaveLength(2);
    expect(s[0].height).toBe(900); // the 920-1300 block crosses 1009 and goes entirely to page 2
    expect(s[1]).toMatchObject({ index: 1, top: 900, height: 400 });
  });

  it("a block taller than a page is cut at the page limit", () => {
    const s = paginate(blocks([0, 2500]), 2500, 1000);
    expect(s.map((x) => x.height)).toEqual([1000, 1000, 500]);
    expect(s.reduce((n, x) => n + x.height, 0)).toBe(2500);
  });

  it("slices are contiguous and cover the whole content", () => {
    const b = Array.from({ length: 40 }, (_, i) => ({ top: i * 60, bottom: i * 60 + 50 }));
    const s = paginate(b, 2400, 1009);
    let at = 0;
    for (const p of s) {
      expect(p.top).toBeCloseTo(at);
      expect(p.height).toBeLessThanOrEqual(1009 + 0.5);
      at += p.height;
    }
    expect(at).toBeCloseTo(2400);
  });

  it("keeps a heading with the block that follows it", () => {
    const b: Block[] = [
      { top: 0, bottom: 800 },
      { top: 820, bottom: 860, keepWithNext: true }, // heading near the page end
      { top: 880, bottom: 1500 }, // its content does not fit
    ];
    const s = paginate(b, 1500, 1009);
    expect(s[0].height).toBe(800); // heading moved to page 2
    expect(s[1].top).toBe(800);
  });

  it("an empty document still yields one page", () => {
    expect(paginate([], 0, 1009)).toHaveLength(1);
  });
});

describe("PDF writer", () => {
  it("writes A4 pages with a valid xref table and trailer", () => {
    const pdf = buildPdf(pages(3));
    const s = new TextDecoder("latin1").decode(pdf);
    expect(s.startsWith("%PDF-1.4")).toBe(true);
    expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
    expect((s.match(/\/Type \/Page /g) ?? []).length).toBe(3);
    expect(s).toContain("/MediaBox [0 0 595.28 841.89]");
    expect(s).toContain("/Count 3");
    const at = Number(/startxref\n(\d+)/.exec(s)![1]);
    expect(s.slice(at, at + 4)).toBe("xref");
    const entries = [...s.slice(at).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    expect(entries).toHaveLength(11); // catalog + pages + 3 x (page, content, image)
    entries.forEach((off, i) => expect(s.slice(off, off + 12)).toMatch(new RegExp(`^${i + 1} 0 obj`)));
    expect(Number(/\/Size (\d+)/.exec(s)![1])).toBe(12);
  });

  it("embeds the JPEG bytes untouched", () => {
    const pdf = buildPdf(pages(1));
    const hay = Array.from(pdf).join(",");
    expect(hay.includes(Array.from(JPEG).join(","))).toBe(true);
  });
});

describe("DOCX writer", () => {
  const entries = () => readZip(buildDocx(pages(2)));
  const part = (n: string) => text(entries().find((e) => e.name === n)!.data);

  it("has the required parts and relationships", () => {
    const names = entries().map((e) => e.name);
    expect(names).toEqual([
      "[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/_rels/document.xml.rels",
      "word/media/page1.jpeg", "word/media/page2.jpeg",
    ]);
    expect(part("word/_rels/document.xml.rels")).toContain('Id="rId2"');
    expect(part("[Content_Types].xml")).toContain('Extension="jpeg" ContentType="image/jpeg"');
  });

  it("every XML part is well-formed", () => {
    for (const n of ["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/_rels/document.xml.rels"]) {
      expect(parse(part(n)).querySelector("parsererror"), n).toBeNull();
    }
  });

  it("is A4 with zero margins and one full-page anchored picture per page, page-broken between pages", () => {
    const xml = part("word/document.xml");
    expect(xml).toContain('w:w="11906" w:h="16838"');
    expect(xml).toContain('w:top="0" w:right="0" w:bottom="0" w:left="0"');
    expect((xml.match(/<wp:anchor /g) ?? []).length).toBe(2);
    expect((xml.match(/cx="7560000" cy="10692000"/g) ?? []).length).toBe(4); // extent + xfrm per page
    expect((xml.match(/w:br w:type="page"/g) ?? []).length).toBe(1); // between pages, none after the last
    expect(documentXml(1)).not.toContain("w:br");
  });
});

describe("ODT writer", () => {
  const entries = () => readZip(buildOdt(pages(2)));
  const part = (n: string) => text(entries().find((e) => e.name === n)!.data);

  it("starts with an uncompressed mimetype entry and has manifest, content, styles and pictures", () => {
    const e = entries();
    expect(e[0].name).toBe("mimetype");
    expect(e[0].method).toBe(0);
    expect(text(e[0].data)).toBe("application/vnd.oasis.opendocument.text");
    expect(e.map((x) => x.name)).toEqual(["mimetype", "META-INF/manifest.xml", "content.xml", "styles.xml", "Pictures/page1.jpeg", "Pictures/page2.jpeg"]);
    const manifest = part("META-INF/manifest.xml");
    expect(manifest).toContain('manifest:full-path="Pictures/page2.jpeg"');
  });

  it("every XML part is well-formed", () => {
    for (const n of ["META-INF/manifest.xml", "content.xml", "styles.xml"]) {
      expect(parse(part(n)).querySelector("parsererror"), n).toBeNull();
    }
  });

  it("is A4, margin-less, with one page-anchored 210x297 mm frame per page and a break before each page after the first", () => {
    expect(part("styles.xml")).toContain('fo:page-width="210mm" fo:page-height="297mm"');
    const c = part("content.xml");
    expect((c.match(/svg:width="210mm" svg:height="297mm"/g) ?? []).length).toBe(2);
    expect(c).toContain('text:anchor-type="page"');
    expect((c.match(/text:style-name="P2"/g) ?? []).length).toBe(1);
    expect(contentXml(1)).not.toContain('text:style-name="P2"');
  });
});

describe("HTML page", () => {
  const snap = {
    html: '<div style="color:red"><h1>Título</h1></div>',
    backgroundCss: "background-color:rgb(250, 249, 245)",
    color: "rgb(31, 30, 29)",
    fontFamily: 'Georgia, "Iowan Old Style", serif',
    warnings: [],
  };

  it("is a self-contained A4 page", () => {
    const html = buildHtmlPage(snap, 'Mi <doc> & "cosa"');
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>Mi &lt;doc&gt; &amp; &quot;cosa&quot;</title>");
    expect(html).toContain("width:210mm");
    expect(html).toContain("background-color:rgb(250, 249, 245)");
    expect(html).toContain("<h1>Título</h1>");
    expect(html).not.toMatch(/(?:src|href)="(?:https?:|file:|asset:)/);
    expect(html).not.toContain("<link");
  });
});

describe("base64 helper", () => {
  it("encodes large buffers without exceeding the call stack", () => {
    const big = new Uint8Array(3_000_000).fill(65);
    const b64 = toBase64(big);
    expect(b64.length).toBe(4_000_000);
    expect(atob(b64.slice(0, 8))).toBe("AAAAAA");
  });
});
