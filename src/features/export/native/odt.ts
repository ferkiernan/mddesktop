// Native OpenDocument (.odt) writer (spec 006 US5): the same structured document as the Word writer, as ODF
// text: headings with outline levels, lists, quotes, coloured code, tables with repeated header rows,
// hyperlinks and pictures. `mimetype` is the first, uncompressed entry (ODF requirement).
import { createZip, type ZipEntry } from "../zip";
import { esc } from "./docx";
import type { Block, NativeDoc, Pic, Run } from "./model";

const MIME = "application/vnd.oasis.opendocument.text";
const XML = '<?xml version="1.0" encoding="UTF-8"?>\n';
const NS =
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" ' +
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" ' +
  'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" ' +
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" ' +
  'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" ' +
  'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
  'xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
  'xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" ' +
  'xmlns:loext="urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0"';

const PX_TO_MM = 25.4 / 96;
const mm = (px: number) => `${(px * PX_TO_MM).toFixed(2)}mm`;

class Ctx {
  autos: string[] = [];
  pictures: ZipEntry[] = [];
  private spans = new Map<string, string>();
  private nextPic = 1;
  constructor(readonly nd: NativeDoc) {}

  /** Automatic text style for a run's formatting, deduplicated. */
  span(r: Run): string | null {
    const t = this.nd.theme;
    const props: string[] = [];
    const font = r.code ? t.mono : r.font;
    if (font) props.push(`style:font-name="${esc(font)}" fo:font-family="${esc(font)}"`);
    if (r.bold) props.push('fo:font-weight="bold"');
    if (r.italic) props.push('fo:font-style="italic"');
    if (r.strike) props.push('style:text-line-through-style="solid"');
    const color = r.color ?? (r.link ? t.link : undefined);
    if (color) props.push(`fo:color="#${color}"`);
    if (r.link) props.push('style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"');
    if (r.sizePt) props.push(`fo:font-size="${r.sizePt}pt"`);
    if (r.shade) props.push(`fo:background-color="#${r.shade}"`);
    if (!props.length) return null;
    const key = props.join(" ");
    let name = this.spans.get(key);
    if (!name) {
      name = `T${this.spans.size + 1}`;
      this.spans.set(key, name);
      this.autos.push(`<style:style style:name="${name}" style:family="text"><style:text-properties ${key}/></style:style>`);
    }
    return name;
  }

  picture(p: Pic): string {
    const n = this.nextPic++;
    const path = `Pictures/image${n}.${p.ext}`;
    this.pictures.push({ name: path, data: p.data });
    return (
      `<draw:frame draw:style-name="fr1" draw:name="Imagen ${n}" text:anchor-type="as-char" svg:width="${mm(p.width)}" svg:height="${mm(p.height)}" draw:z-index="${n}">` +
      `<draw:image xlink:href="${path}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>` +
      `<svg:desc>${esc(p.alt)}</svg:desc></draw:frame>`
    );
  }
}

function runs(ctx: Ctx, list: Run[]): string {
  let out = "";
  for (const r of list) {
    let inner: string;
    if (r.br) inner = "<text:line-break/>";
    else if (r.pic) inner = ctx.picture(r.pic);
    else {
      // runs of spaces must be explicit in ODF
      const text = esc(r.text ?? "").replace(/ {2,}/g, (m) => ` <text:s text:c="${m.length - 1}"/>`).replace(/\t/g, "<text:tab/>");
      const style = ctx.span(r);
      inner = style ? `<text:span text:style-name="${style}">${text}</text:span>` : text;
    }
    out += r.link && /^(https?:|mailto:)/i.test(r.link) ? `<text:a xlink:type="simple" xlink:href="${esc(r.link)}">${inner}</text:a>` : inner;
  }
  return out;
}

function blocksXml(ctx: Ctx, list: Block[], quote: boolean): string {
  const t = ctx.nd.theme;
  const pStyle = quote ? "Quote" : "Text_20_body";
  const q = (rs: Run[]) => (quote ? rs.map((r) => (r.color ? r : { ...r, color: t.quoteFg })) : rs);
  let out = "";
  for (const b of list) {
    switch (b.type) {
      case "heading":
        out += `<text:h text:style-name="Heading_20_${b.level}" text:outline-level="${b.level}">${runs(ctx, q(b.runs))}</text:h>`;
        break;
      case "para":
        out += `<text:p text:style-name="${pStyle}">${runs(ctx, q(b.runs))}</text:p>`;
        break;
      case "hr":
        out += `<text:p text:style-name="Horizontal_20_Line"/>`;
        break;
      case "code":
        for (const line of b.lines) {
          out += `<text:p text:style-name="Code">${runs(ctx, line.map((r) => ({ ...r, color: r.color ?? t.codeFg, code: true })))}</text:p>`;
        }
        break;
      case "quote":
        out += blocksXml(ctx, b.blocks, true);
        break;
      case "list": {
        const style = b.items.some((i) => i.checked !== undefined) ? "LTask" : b.ordered ? "LNum" : "LBullet";
        out += `<text:list text:style-name="${style}">`;
        for (const item of b.items) {
          out += "<text:list-item>";
          item.blocks.forEach((inner, i) => {
            if (i === 0 && inner.type === "para" && item.checked !== undefined) {
              out += `<text:p text:style-name="${pStyle}">${runs(ctx, [{ text: item.checked ? "☑ " : "☐ " }, ...q(inner.runs)])}</text:p>`;
            } else {
              out += blocksXml(ctx, [inner], quote);
            }
          });
          out += "</text:list-item>";
        }
        out += "</text:list>";
        break;
      }
      case "table": {
        const cols = Math.max(1, ...b.rows.map((r) => r.cells.length));
        const n = ctx.autos.length + 1;
        ctx.autos.push(`<style:style style:name="Tbl${n}" style:family="table"><style:table-properties style:width="180mm" table:align="margins"/></style:style>`);
        let x = `<table:table table:name="Tabla${n}" table:style-name="Tbl${n}"><table:table-column table:number-columns-repeated="${cols}"/>`;
        const headers = b.rows.filter((r) => r.header);
        const rowXml = (row: (typeof b.rows)[number]) =>
          `<table:table-row>` +
          Array.from({ length: cols }, (_, i) => {
            const cell = row.cells[i] ?? [];
            const align = b.align[i] === "center" ? "Cell_Center" : b.align[i] === "right" ? "Cell_Right" : "Cell";
            const rs = row.header ? cell.map((r) => ({ ...r, bold: true })) : cell;
            return `<table:table-cell table:style-name="${row.header ? "CellHead" : "CellBody"}" office:value-type="string"><text:p text:style-name="${align}">${runs(ctx, rs)}</text:p></table:table-cell>`;
          }).join("") +
          `</table:table-row>`;
        if (headers.length) x += `<table:table-header-rows>${headers.map(rowXml).join("")}</table:table-header-rows>`;
        x += b.rows.filter((r) => !r.header).map(rowXml).join("");
        out += x + `</table:table>`;
        break;
      }
    }
  }
  return out;
}

function listStyle(name: string, kind: "bullet" | "number" | "none"): string {
  const bullets = ["•", "◦", "▪"];
  const lvls = Array.from({ length: 10 }, (_, i) => {
    const props = `<style:list-level-properties text:list-level-position-and-space-mode="label-alignment"><style:list-level-label-alignment text:label-followed-by="listtab" fo:text-indent="-6mm" fo:margin-left="${(i + 1) * 6}mm"/></style:list-level-properties>`;
    if (kind === "number") return `<text:list-level-style-number text:level="${i + 1}" style:num-suffix="." style:num-format="${i % 3 === 1 ? "a" : i % 3 === 2 ? "i" : "1"}">${props}</text:list-level-style-number>`;
    return `<text:list-level-style-bullet text:level="${i + 1}" text:bullet-char="${kind === "none" ? " " : bullets[i % 3]}">${props}</text:list-level-style-bullet>`;
  }).join("");
  return `<text:list-style style:name="${name}">${lvls}</text:list-style>`;
}

function stylesXml(nd: NativeDoc): string {
  const t = nd.theme;
  const sizes = [2.0, 1.5, 1.25, 1.1, 1.0, 0.9];
  const heading = (n: number) =>
    `<style:style style:name="Heading_20_${n}" style:display-name="Heading ${n}" style:family="paragraph" style:parent-style-name="Standard" style:next-style-name="Text_20_body" style:default-outline-level="${n}" style:class="text">` +
    `<style:paragraph-properties fo:margin-top="${n <= 2 ? 6 : 4}mm" fo:margin-bottom="2mm" fo:keep-with-next="always"/>` +
    `<style:text-properties fo:font-size="${(t.sizePt * sizes[n - 1]).toFixed(1)}pt" fo:font-weight="bold"/></style:style>`;
  const fonts = [...new Set([t.font, t.mono])].map((f) => `<style:font-face style:name="${esc(f)}" svg:font-family="'${esc(f)}'"/>`).join("");
  const border = `0.5pt solid #${t.border}`;
  return (
    XML +
    `<office:document-styles ${NS} office:version="1.3">` +
    `<office:font-face-decls>${fonts}</office:font-face-decls>` +
    `<office:styles>` +
    `<style:default-style style:family="paragraph"><style:text-properties style:font-name="${esc(t.font)}" fo:font-family="'${esc(t.font)}'" fo:font-size="${t.sizePt}pt" fo:color="#${t.fg}" fo:language="es" fo:country="ES"/></style:default-style>` +
    `<style:style style:name="Standard" style:family="paragraph" style:class="text"/>` +
    `<style:style style:name="Text_20_body" style:display-name="Text body" style:family="paragraph" style:parent-style-name="Standard" style:class="text"><style:paragraph-properties fo:margin-bottom="2mm" fo:line-height="115%"/></style:style>` +
    [1, 2, 3, 4, 5, 6].map(heading).join("") +
    `<style:style style:name="Quote" style:family="paragraph" style:parent-style-name="Text_20_body"><style:paragraph-properties fo:margin-left="6mm" fo:padding-left="3mm" fo:border-left="1.5pt solid #${t.quoteBorder}"/><style:text-properties fo:color="#${t.quoteFg}"/></style:style>` +
    `<style:style style:name="Code" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:background-color="#${t.codeBg}" fo:padding-left="2mm" fo:padding-right="2mm" fo:margin-top="0mm" fo:margin-bottom="0mm"/><style:text-properties style:font-name="${esc(t.mono)}" fo:font-family="'${esc(t.mono)}'" fo:font-size="${(t.sizePt * 0.9).toFixed(1)}pt" fo:color="#${t.codeFg}"/></style:style>` +
    `<style:style style:name="Horizontal_20_Line" style:display-name="Horizontal Line" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-bottom="3mm" fo:border-bottom="0.75pt solid #${t.border}" fo:padding="0mm"/></style:style>` +
    `<style:style style:name="Cell" style:family="paragraph" style:parent-style-name="Standard"/>` +
    `<style:style style:name="Cell_Center" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:text-align="center"/></style:style>` +
    `<style:style style:name="Cell_Right" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:text-align="end"/></style:style>` +
    `<style:style style:name="CellHead" style:family="table-cell"><style:table-cell-properties fo:background-color="#${t.headerBg}" fo:padding="1.5mm" fo:border="${border}"/></style:style>` +
    `<style:style style:name="CellBody" style:family="table-cell"><style:table-cell-properties fo:padding="1.5mm" fo:border="${border}"/></style:style>` +
    `<style:style style:name="fr1" style:family="graphic"><style:graphic-properties style:vertical-pos="top" style:vertical-rel="baseline"/></style:style>` +
    listStyle("LBullet", "bullet") +
    listStyle("LNum", "number") +
    listStyle("LTask", "none") +
    `</office:styles>` +
    `<office:automatic-styles><style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="210mm" fo:page-height="297mm" style:print-orientation="portrait" fo:margin-top="15mm" fo:margin-bottom="15mm" fo:margin-left="15mm" fo:margin-right="15mm"${t.bg !== "FFFFFF" ? ` fo:background-color="#${t.bg}"` : ""}/></style:page-layout></office:automatic-styles>` +
    `<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles>` +
    `</office:document-styles>`
  );
}

export function buildNativeOdt(nd: NativeDoc): Uint8Array {
  const enc = new TextEncoder();
  const ctx = new Ctx(nd);
  const body = blocksXml(ctx, nd.blocks, false) || `<text:p text:style-name="Text_20_body"/>`;
  const content =
    XML +
    `<office:document-content ${NS} office:version="1.3">` +
    `<office:automatic-styles>${ctx.autos.join("")}</office:automatic-styles>` +
    `<office:body><office:text>${body}</office:text></office:body></office:document-content>`;
  const meta =
    XML +
    `<office:document-meta ${NS} office:version="1.3"><office:meta><dc:title>${esc(nd.title)}</dc:title><meta:generator>MD Desktop</meta:generator></office:meta></office:document-meta>`;
  const types: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", gif: "image/gif" };
  const file = (path: string, type: string) => `<manifest:file-entry manifest:full-path="${path}" manifest:media-type="${type}"/>`;
  const manifest =
    XML +
    `<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">` +
    `<manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="${MIME}"/>` +
    file("content.xml", "text/xml") +
    file("styles.xml", "text/xml") +
    file("meta.xml", "text/xml") +
    ctx.pictures.map((p) => file(p.name, types[p.name.split(".").pop() ?? "png"] ?? "image/png")).join("") +
    `</manifest:manifest>`;
  return createZip([
    { name: "mimetype", data: enc.encode(MIME) },
    { name: "META-INF/manifest.xml", data: enc.encode(manifest) },
    { name: "content.xml", data: enc.encode(content) },
    { name: "styles.xml", data: enc.encode(stylesXml(nd)) },
    { name: "meta.xml", data: enc.encode(meta) },
    ...ctx.pictures,
  ]);
}
