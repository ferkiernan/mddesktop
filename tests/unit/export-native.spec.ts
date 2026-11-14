// Spec 006: native Word / OpenDocument writers produce real structure (not page images).
import { describe, expect, it } from "vitest";
import { buildNativeDocx } from "../../src/features/export/native/docx";
import { buildNativeOdt } from "../../src/features/export/native/odt";
import { commonFont, contrast, readable } from "../../src/features/export/native/color";
import type { NativeDoc } from "../../src/features/export/native/model";
import { readZip } from "../../src/features/export/zip";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const doc: NativeDoc = {
  title: "Informe <final> & más",
  warnings: [],
  theme: {
    fg: "1F2328", bg: "FFFFFF", dark: false, font: "Georgia", mono: "Consolas", sizePt: 12, link: "0000EE",
    codeBg: "F6F7F9", codeFg: "1F2328", quoteFg: "57606A", quoteBorder: "D0D4DA", border: "D0D4DA", headerBg: "F6F7F9",
  },
  blocks: [
    { type: "heading", level: 1, runs: [{ text: "Título & <uno>" }] },
    { type: "para", runs: [{ text: "Texto con " }, { text: "negrita", bold: true }, { text: " y " }, { text: "enlace", link: "https://example.com/?a=1&b=2" }] },
    { type: "list", ordered: false, start: 1, items: [{ blocks: [{ type: "para", runs: [{ text: "uno" }] }] }, { checked: true, blocks: [{ type: "para", runs: [{ text: "hecha" }] }] }] },
    { type: "list", ordered: true, start: 3, items: [{ blocks: [{ type: "para", runs: [{ text: "tercero" }] }] }] },
    { type: "quote", blocks: [{ type: "para", runs: [{ text: "cita" }] }] },
    { type: "code", lines: [[{ text: "const x = 1;", color: "A626A4" }], [{ text: "  return x;" }]] },
    {
      type: "table",
      align: ["left", "right"],
      rows: [
        { header: true, cells: [[{ text: "A" }], [{ text: "B" }]] },
        { header: false, cells: [[{ text: "1" }], [{ text: "2" }]] },
      ],
    },
    { type: "para", runs: [{ pic: { data: PNG, ext: "png", width: 100, height: 50, alt: "Diagrama" } }] },
    { type: "hr" },
  ],
};

const files = (zip: Uint8Array) => Object.fromEntries(readZip(zip).map((f) => [f.name, f.data]));
const text = (b: Uint8Array) => new TextDecoder().decode(b);
const wellFormed = (xml: string) => !new DOMParser().parseFromString(xml, "application/xml").querySelector("parsererror");

describe("native DOCX (spec 006)", () => {
  const f = files(buildNativeDocx(doc));
  const d = text(f["word/document.xml"]);

  it("is a well-formed package with styles, numbering, settings and the picture", () => {
    for (const p of ["[Content_Types].xml", "word/document.xml", "word/styles.xml", "word/numbering.xml", "word/settings.xml", "word/_rels/document.xml.rels", "word/media/image1.png"]) {
      expect(f[p], p).toBeDefined();
      if (p.endsWith(".xml") || p.endsWith(".rels")) expect(wellFormed(text(f[p])), p).toBe(true);
    }
    expect(Object.keys(f).some((n) => /page\d+\.jpeg/.test(n))).toBe(false); // no page images
  });

  it("uses heading styles, real lists, task boxes, hyperlinks and escaped text", () => {
    expect(d).toContain('<w:pStyle w:val="Heading1"/>');
    expect(d).toContain("Título &amp; &lt;uno&gt;");
    expect(d).toMatch(/<w:numPr><w:ilvl w:val="0"\/><w:numId w:val="1"\/>/);
    expect(d).toContain("☑ ");
    expect(d).toMatch(/<w:hyperlink r:id="rId\d+"/);
    expect(text(f["word/_rels/document.xml.rels"])).toContain("https://example.com/?a=1&amp;b=2");
    expect(text(f["word/numbering.xml"])).toContain('<w:startOverride w:val="3"/>');
  });

  it("writes tables with a repeated header row, rows that do not split and column alignment", () => {
    expect(d).toContain("<w:tbl>");
    expect(d).toContain("<w:tblHeader/>");
    expect(d).toContain("<w:cantSplit/>");
    expect(d).toContain('<w:jc w:val="right"/>');
  });

  it("keeps code as monospaced text with its colours and A4 margins", () => {
    expect(d).toContain('<w:pStyle w:val="Code"/>');
    expect(d).toContain('<w:color w:val="A626A4"/>');
    expect(d).toContain('xml:space="preserve">  return x;</w:t>');
    expect(d).toContain('<w:pgSz w:w="11906" w:h="16838"/>');
  });
});

describe("native ODT (spec 006 US5)", () => {
  const zip = buildNativeOdt(doc);
  const f = files(zip);
  const c = text(f["content.xml"]);

  it("is a valid package (mimetype first) with the same content", () => {
    expect(readZip(zip)[0].name).toBe("mimetype");
    for (const p of ["content.xml", "styles.xml", "meta.xml", "META-INF/manifest.xml"]) expect(wellFormed(text(f[p])), p).toBe(true);
    expect(f["Pictures/image1.png"]).toBeDefined();
    expect(c).toContain('text:outline-level="1"');
    expect(c).toContain("<table:table-header-rows>");
    expect(c).toContain('xlink:href="https://example.com/?a=1&amp;b=2"');
    expect(c).toContain("☑ ");
    expect(c).toContain('<text:s text:c="1"/>'); // two leading spaces of the code line
  });
});

describe("colours and fonts", () => {
  it("fixes unreadable text and maps fonts to common ones", () => {
    expect(contrast(readable([90, 90, 90], [40, 40, 40]), [40, 40, 40])).toBeGreaterThanOrEqual(4.5);
    expect(commonFont('"Share Tech Mono", monospace', true)).toBe("Consolas");
    expect(commonFont("Georgia, serif")).toBe("Georgia");
    expect(commonFont("system-ui, sans-serif")).toBe("Segoe UI");
  });
});
