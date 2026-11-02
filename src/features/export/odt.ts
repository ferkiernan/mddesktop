// ODT writer: A4 page layout with zero margins; each page is a page-anchored frame (210 x 297 mm)
// holding the page image. `mimetype` is the first, uncompressed entry (ODF requirement).
import { A4 } from "./constants";
import { createZip } from "./zip";
import type { RenderedPage } from "./rasterize";

const MIME = "application/vnd.oasis.opendocument.text";
const XML = '<?xml version="1.0" encoding="UTF-8"?>\n';

const NS =
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" ' +
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
  'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" ' +
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" ' +
  'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" ' +
  'xmlns:xlink="http://www.w3.org/1999/xlink"';

export function contentXml(pageCount: number): string {
  const pages = Array.from({ length: pageCount }, (_, i) => {
    const n = i + 1;
    return (
      `<text:p text:style-name="${i === 0 ? "P1" : "P2"}">` +
      `<draw:frame draw:style-name="fr1" draw:name="Página ${n}" text:anchor-type="page" text:anchor-page-number="${n}" ` +
      `svg:x="0mm" svg:y="0mm" svg:width="${A4.widthMm}mm" svg:height="${A4.heightMm}mm" draw:z-index="${i}">` +
      `<draw:image xlink:href="Pictures/page${n}.jpeg" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>` +
      `</draw:frame></text:p>`
    );
  }).join("");
  return (
    XML +
    `<office:document-content ${NS} office:version="1.2">` +
    `<office:automatic-styles>` +
    `<style:style style:name="P1" style:family="paragraph" style:parent-style-name="Standard">` +
    `<style:paragraph-properties fo:margin-top="0mm" fo:margin-bottom="0mm" fo:line-height="0.1mm"/></style:style>` +
    `<style:style style:name="P2" style:family="paragraph" style:parent-style-name="Standard">` +
    `<style:paragraph-properties fo:margin-top="0mm" fo:margin-bottom="0mm" fo:line-height="0.1mm" fo:break-before="page"/></style:style>` +
    `<style:style style:name="fr1" style:family="graphic" style:parent-style-name="Graphics">` +
    `<style:graphic-properties style:run-through="foreground" style:wrap="none" style:horizontal-pos="from-left" ` +
    `style:horizontal-rel="page" style:vertical-pos="from-top" style:vertical-rel="page" ` +
    `fo:margin-left="0mm" fo:margin-right="0mm" fo:margin-top="0mm" fo:margin-bottom="0mm" ` +
    `fo:padding="0mm" fo:border="none" draw:wrap-influence-on-position="once-concurrent"/></style:style>` +
    `</office:automatic-styles>` +
    `<office:body><office:text>${pages}</office:text></office:body></office:document-content>`
  );
}

export function stylesXml(): string {
  return (
    XML +
    `<office:document-styles ${NS} office:version="1.2">` +
    `<office:styles>` +
    `<style:style style:name="Standard" style:family="paragraph" style:class="text"/>` +
    `<style:style style:name="Graphics" style:family="graphic"><style:graphic-properties text:anchor-type="paragraph" ` +
    `svg:x="0mm" svg:y="0mm" style:wrap="none"/></style:style>` +
    `</office:styles>` +
    `<office:automatic-styles>` +
    `<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="${A4.widthMm}mm" ` +
    `fo:page-height="${A4.heightMm}mm" style:print-orientation="portrait" fo:margin-top="0mm" fo:margin-bottom="0mm" ` +
    `fo:margin-left="0mm" fo:margin-right="0mm"/></style:page-layout>` +
    `</office:automatic-styles>` +
    `<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles>` +
    `</office:document-styles>`
  );
}

export function manifestXml(pageCount: number): string {
  const file = (path: string, type: string) =>
    `<manifest:file-entry manifest:full-path="${path}" manifest:media-type="${type}"/>`;
  return (
    XML +
    `<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">` +
    `<manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="${MIME}"/>` +
    file("content.xml", "text/xml") +
    file("styles.xml", "text/xml") +
    Array.from({ length: pageCount }, (_, i) => file(`Pictures/page${i + 1}.jpeg`, "image/jpeg")).join("") +
    `</manifest:manifest>`
  );
}

export function buildOdt(pages: Pick<RenderedPage, "jpeg">[]): Uint8Array {
  const enc = new TextEncoder();
  const n = Math.max(pages.length, 1);
  return createZip([
    { name: "mimetype", data: enc.encode(MIME) },
    { name: "META-INF/manifest.xml", data: enc.encode(manifestXml(pages.length)) },
    { name: "content.xml", data: enc.encode(contentXml(n)) },
    { name: "styles.xml", data: enc.encode(stylesXml()) },
    ...pages.map((p, i) => ({ name: `Pictures/page${i + 1}.jpeg`, data: p.jpeg })),
  ]);
}
