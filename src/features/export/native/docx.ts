// Native Word (.docx) writer (spec 006): real paragraphs, heading styles (navigation pane), numbered and bulleted
// lists, task boxes, quotes, coloured code, tables (header repeated, rows never split), hyperlinks and pictures.
// A4 page with 15 mm margins; dark styles also set the page colour.
import { createZip, type ZipEntry } from "../zip";
import type { Block, NativeDoc, Pic, Run } from "./model";

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const W_NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

/** Escapes text for XML and drops characters XML 1.0 does not allow. */
export const esc = (s: string) =>
  s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const EMU_PER_PX = 9525;
const PAGE = { w: 11906, h: 16838, margin: 850 }; // twips; 15 mm margins
const CONTENT_TWIPS = PAGE.w - 2 * PAGE.margin;

class Doc {
  rels: string[] = [];
  media: ZipEntry[] = [];
  private nextRel = 10;
  private nextPic = 1;
  private nextNum = 3;
  nums: string[] = [];

  hyperlink(url: string): string {
    const id = `rId${this.nextRel++}`;
    this.rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(url)}" TargetMode="External"/>`);
    return id;
  }

  picture(p: Pic): { rel: string; n: number } {
    const n = this.nextPic++;
    const rel = `rId${this.nextRel++}`;
    const name = `image${n}.${p.ext}`;
    this.rels.push(`<Relationship Id="${rel}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`);
    this.media.push({ name: `word/media/${name}`, data: p.data });
    return { rel, n };
  }

  /** A fresh numbering instance so each ordered list restarts at its own start number. */
  orderedNum(start: number): number {
    const id = this.nextNum++;
    this.nums.push(`<w:num w:numId="${id}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="${start}"/></w:lvlOverride></w:num>`);
    return id;
  }
}

/** Run properties in schema order (rStyle, rFonts, b, i, strike, color, sz, u, shd). */
function rPr(r: Run, mono: string): string {
  const p: string[] = [];
  if (r.link && !r.color) p.push('<w:rStyle w:val="Hyperlink"/>');
  if (r.code) p.push(`<w:rFonts w:ascii="${esc(mono)}" w:hAnsi="${esc(mono)}" w:cs="${esc(mono)}"/>`);
  else if (r.font) p.push(`<w:rFonts w:ascii="${esc(r.font)}" w:hAnsi="${esc(r.font)}" w:cs="${esc(r.font)}"/>`);
  if (r.bold) p.push("<w:b/>");
  if (r.italic) p.push("<w:i/>");
  if (r.strike) p.push("<w:strike/>");
  if (r.color) p.push(`<w:color w:val="${r.color}"/>`);
  if (r.sizePt) p.push(`<w:sz w:val="${Math.round(r.sizePt * 2)}"/>`);
  if (r.link) p.push("<w:u w:val=\"single\"/>");
  if (r.shade) p.push(`<w:shd w:val="clear" w:color="auto" w:fill="${r.shade}"/>`);
  return p.length ? `<w:rPr>${p.join("")}</w:rPr>` : "";
}

function drawing(doc: Doc, p: Pic): string {
  const { rel, n } = doc.picture(p);
  const cx = Math.round(p.width * EMU_PER_PX);
  const cy = Math.round(p.height * EMU_PER_PX);
  return (
    `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:docPr id="${n}" name="Imagen ${n}" descr="${esc(p.alt)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>` +
    `<pic:nvPicPr><pic:cNvPr id="${n}" name="image${n}.${p.ext}" descr="${esc(p.alt)}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rel}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`
  );
}

function runs(doc: Doc, list: Run[], mono: string): string {
  let out = "";
  for (const r of list) {
    let inner: string;
    if (r.br) inner = "<w:r><w:br/></w:r>";
    else if (r.pic) inner = `<w:r>${drawing(doc, r.pic)}</w:r>`;
    else inner = `<w:r>${rPr(r, mono)}<w:t xml:space="preserve">${esc(r.text ?? "")}</w:t></w:r>`;
    out += r.link && /^(https?:|mailto:)/i.test(r.link) ? `<w:hyperlink r:id="${doc.hyperlink(r.link)}" w:history="1">${inner}</w:hyperlink>` : inner;
  }
  return out;
}

const para = (pPr: string, body: string) => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${body}</w:p>`;

function blocksXml(doc: Doc, nd: NativeDoc, list: Block[], ctx: { level: number; quote: boolean }): string {
  const t = nd.theme;
  // paragraph properties must follow the schema order (pStyle, keepNext, numPr, pBdr, shd, spacing, ind, jc)
  const quoteBdr = ctx.quote ? `<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="${t.quoteBorder}"/></w:pBdr>` : "";
  const quotePr = ctx.quote ? `${quoteBdr}<w:ind w:left="${360 + ctx.level * 360}"/>` : "";
  const quoteRun = (rs: Run[]) => (ctx.quote ? rs.map((r) => (r.color ? r : { ...r, color: t.quoteFg })) : rs);
  let out = "";
  for (const b of list) {
    switch (b.type) {
      case "heading":
        out += para(`<w:pStyle w:val="Heading${b.level}"/>${quotePr}`, runs(doc, quoteRun(b.runs), t.mono));
        break;
      case "para":
        out += para(quotePr, runs(doc, quoteRun(b.runs), t.mono));
        break;
      case "hr":
        out += para(`<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="${t.border}"/></w:pBdr>`, "");
        break;
      case "code":
        b.lines.forEach((line, i) => {
          const first = i === 0;
          const last = i === b.lines.length - 1;
          const pPr =
            `<w:pStyle w:val="Code"/><w:shd w:val="clear" w:color="auto" w:fill="${t.codeBg}"/>` +
            `<w:spacing w:before="${first ? 120 : 0}" w:after="${last ? 120 : 0}" w:line="240" w:lineRule="auto"/>` +
            (ctx.level ? `<w:ind w:left="${ctx.level * 360}"/>` : "");
          const body = line.length ? runs(doc, line.map((r) => ({ ...r, color: r.color ?? t.codeFg, code: true })), t.mono) : "";
          out += para(pPr, body);
        });
        break;
      case "quote":
        out += blocksXml(doc, nd, b.blocks, { ...ctx, quote: true });
        break;
      case "list": {
        const numId = b.ordered ? doc.orderedNum(b.start) : 1;
        for (const item of b.items) {
          item.blocks.forEach((inner, i) => {
            if (i === 0 && inner.type === "para") {
              const lvl = Math.min(ctx.level, 8);
              if (item.checked !== undefined) {
                const box = { text: item.checked ? "☑ " : "☐ " } as Run;
                out += para(`${quoteBdr}<w:ind w:left="${360 + lvl * 360}"/>`, runs(doc, [box, ...quoteRun(inner.runs)], t.mono));
              } else {
                out += para(`<w:numPr><w:ilvl w:val="${lvl}"/><w:numId w:val="${numId}"/></w:numPr>${quoteBdr}`, runs(doc, quoteRun(inner.runs), t.mono));
              }
            } else if (inner.type === "list") {
              out += blocksXml(doc, nd, [inner], { ...ctx, level: ctx.level + 1 });
            } else {
              out += blocksXml(doc, nd, [inner], { ...ctx, level: ctx.level + 1 });
            }
          });
        }
        break;
      }
      case "table": {
        const cols = Math.max(1, ...b.rows.map((r) => r.cells.length));
        const colW = Math.floor(CONTENT_TWIPS / cols);
        const border = (s: string) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="${t.border}"/>`;
        let x =
          `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>` +
          `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(border).join("")}</w:tblBorders><w:tblLayout w:type="autofit"/>` +
          `<w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>` +
          `<w:tblGrid>${Array.from({ length: cols }, () => `<w:gridCol w:w="${colW}"/>`).join("")}</w:tblGrid>`;
        for (const row of b.rows) {
          x += `<w:tr><w:trPr><w:cantSplit/>${row.header ? "<w:tblHeader/>" : ""}</w:trPr>`;
          for (let i = 0; i < cols; i++) {
            const cell = row.cells[i] ?? [];
            const shade = row.header ? `<w:shd w:val="clear" w:color="auto" w:fill="${t.headerBg}"/>` : "";
            const jc = b.align[i] && b.align[i] !== "left" ? `<w:jc w:val="${b.align[i]}"/>` : "";
            const rs = row.header ? cell.map((r) => ({ ...r, bold: true })) : cell;
            x += `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/>${shade}</w:tcPr>${para(`<w:spacing w:before="40" w:after="40"/>${jc}`, runs(doc, rs, t.mono))}</w:tc>`;
          }
          x += `</w:tr>`;
        }
        out += x + `</w:tbl>` + para("", ""); // Word needs a paragraph after a table
        break;
      }
    }
  }
  return out;
}

function stylesXml(nd: NativeDoc): string {
  const t = nd.theme;
  const sizes = [2.0, 1.5, 1.25, 1.1, 1.0, 0.9];
  const heading = (n: number) =>
    `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>` +
    `<w:pPr><w:keepNext/><w:spacing w:before="${n <= 2 ? 360 : 240}" w:after="120"/><w:outlineLvl w:val="${n - 1}"/></w:pPr>` +
    `<w:rPr><w:b/><w:sz w:val="${Math.round(t.sizePt * sizes[n - 1] * 2)}"/></w:rPr></w:style>`;
  return (
    XML +
    `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${esc(t.font)}" w:hAnsi="${esc(t.font)}" w:cs="${esc(t.font)}" w:eastAsia="${esc(t.font)}"/>` +
    `<w:color w:val="${t.fg}"/><w:sz w:val="${Math.round(t.sizePt * 2)}"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault>` +
    `<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>` +
    [1, 2, 3, 4, 5, 6].map(heading).join("") +
    `<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/>` +
    `<w:rPr><w:rFonts w:ascii="${esc(t.mono)}" w:hAnsi="${esc(t.mono)}" w:cs="${esc(t.mono)}"/><w:color w:val="${t.codeFg}"/><w:sz w:val="${Math.round(t.sizePt * 0.9 * 2)}"/></w:rPr></w:style>` +
    `<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="${t.link}"/><w:u w:val="single"/></w:rPr></w:style>` +
    `</w:styles>`
  );
}

function numberingXml(): string {
  const bullets = ["•", "◦", "▪"];
  const lvls = (ordered: boolean) =>
    Array.from({ length: 9 }, (_, i) =>
      `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${ordered ? (i % 3 === 1 ? "lowerLetter" : i % 3 === 2 ? "lowerRoman" : "decimal") : "bullet"}"/>` +
      `<w:lvlText w:val="${ordered ? `%${i + 1}.` : bullets[i % 3]}"/><w:lvlJc w:val="left"/>` +
      `<w:pPr><w:ind w:left="${720 + i * 360}" w:hanging="360"/></w:pPr></w:lvl>`,
    ).join("");
  return (
    XML +
    `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${lvls(false)}</w:abstractNum>` +
    `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${lvls(true)}</w:abstractNum>` +
    `<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>` +
    `<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>`
  );
}

export function buildNativeDocx(nd: NativeDoc): Uint8Array {
  const enc = new TextEncoder();
  const doc = new Doc();
  const t = nd.theme;
  const body = blocksXml(doc, nd, nd.blocks, { level: 0, quote: false }) || para("", "");
  const background = t.bg !== "FFFFFF" ? `<w:background w:color="${t.bg}"/>` : "";
  const document =
    XML +
    `<w:document ${W_NS}>${background}<w:body>${body}` +
    `<w:sectPr><w:pgSz w:w="${PAGE.w}" w:h="${PAGE.h}"/>` +
    `<w:pgMar w:top="${PAGE.margin}" w:right="${PAGE.margin}" w:bottom="${PAGE.margin}" w:left="${PAGE.margin}" w:header="425" w:footer="425" w:gutter="0"/></w:sectPr>` +
    `</w:body></w:document>`;
  const numbering = numberingXml() + doc.nums.join("") + `</w:numbering>`;
  const settings =
    XML +
    `<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    (background ? "<w:displayBackgroundShape/>" : "") +
    `<w:defaultTabStop w:val="720"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
  const docRels =
    XML +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>` +
    doc.rels.join("") +
    `</Relationships>`;
  const core =
    XML +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">` +
    `<dc:title>${esc(nd.title)}</dc:title></cp:coreProperties>`;
  const W = "application/vnd.openxmlformats-officedocument.wordprocessingml";
  return createZip([
    {
      name: "[Content_Types].xml",
      data: enc.encode(
        XML +
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/>` +
          `<Override PartName="/word/document.xml" ContentType="${W}.document.main+xml"/>` +
          `<Override PartName="/word/styles.xml" ContentType="${W}.styles+xml"/>` +
          `<Override PartName="/word/numbering.xml" ContentType="${W}.numbering+xml"/>` +
          `<Override PartName="/word/settings.xml" ContentType="${W}.settings+xml"/>` +
          `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
          `</Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      data: enc.encode(
        XML +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
          `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
          `</Relationships>`,
      ),
    },
    { name: "docProps/core.xml", data: enc.encode(core) },
    { name: "word/document.xml", data: enc.encode(document) },
    { name: "word/styles.xml", data: enc.encode(stylesXml(nd)) },
    { name: "word/numbering.xml", data: enc.encode(numbering) },
    { name: "word/settings.xml", data: enc.encode(settings) },
    { name: "word/_rels/document.xml.rels", data: enc.encode(docRels) },
    ...doc.media,
  ]);
}
