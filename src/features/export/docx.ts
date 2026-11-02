// DOCX writer: A4 section with zero margins; each page is a page-anchored picture (210 x 297 mm)
// in its own paragraph, separated by page breaks. Structure per contracts/export-package-formats.md.
import { A4 } from "./constants";
import { createZip } from "./zip";
import type { RenderedPage } from "./rasterize";

const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function pageParagraph(i: number, last: boolean): string {
  const n = i + 1;
  const { widthEmu: cx, heightEmu: cy } = A4;
  return (
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr>` +
    `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251658240 + i}" ` +
    `behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1">` +
    `<wp:simplePos x="0" y="0"/>` +
    `<wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH>` +
    `<wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV>` +
    `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>` +
    `<wp:docPr id="${n}" name="Página ${n}"/><wp:cNvGraphicFramePr/>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="page${n}.jpeg"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="rId${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>` +
    `</a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>` +
    (last ? "" : `<w:r><w:br w:type="page"/></w:r>`) +
    `</w:p>`
  );
}

export function documentXml(pageCount: number): string {
  const body = Array.from({ length: pageCount }, (_, i) => pageParagraph(i, i === pageCount - 1)).join("");
  return (
    XML +
    `<w:document ${NS}><w:body>${body}` +
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>` +
    `<w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>` +
    `</w:body></w:document>`
  );
}

export function buildDocx(pages: Pick<RenderedPage, "jpeg">[]): Uint8Array {
  const enc = new TextEncoder();
  const n = Math.max(pages.length, 1);
  const rels =
    XML +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    pages
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page${i + 1}.jpeg"/>`,
      )
      .join("") +
    `</Relationships>`;

  return createZip([
    {
      name: "[Content_Types].xml",
      data: enc.encode(
        XML +
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Default Extension="jpeg" ContentType="image/jpeg"/>` +
          `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
          `</Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      data: enc.encode(
        XML +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
          `</Relationships>`,
      ),
    },
    { name: "word/document.xml", data: enc.encode(documentXml(n)) },
    { name: "word/_rels/document.xml.rels", data: enc.encode(rels) },
    ...pages.map((p, i) => ({ name: `word/media/page${i + 1}.jpeg`, data: p.jpeg })),
  ]);
}
