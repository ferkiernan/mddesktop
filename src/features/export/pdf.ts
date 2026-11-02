// PDF writer: one full-page JPEG per A4 page (595.28 x 841.89 pt), valid xref table.
import { A4 } from "./constants";
import { concat } from "./zip";
import type { RenderedPage } from "./rasterize";

export function buildPdf(pages: Pick<RenderedPage, "jpeg" | "width" | "height">[]): Uint8Array {
  const enc = new TextEncoder();
  const text = (s: string) => enc.encode(s);
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (b: Uint8Array) => {
    parts.push(b);
    length += b.length;
  };
  const object = (id: number, body: Uint8Array | string, stream?: Uint8Array) => {
    offsets[id] = length;
    push(text(`${id} 0 obj\n`));
    push(typeof body === "string" ? text(body) : body);
    if (stream) {
      push(text("\nstream\n"));
      push(stream);
      push(text("\nendstream"));
    }
    push(text("\nendobj\n"));
  };

  push(new Uint8Array([...text("%PDF-1.4\n%"), 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const n = pages.length;
  const pageId = (i: number) => 3 + i * 3;
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(" ")}] /Count ${n} >>`);

  pages.forEach((p, i) => {
    const id = pageId(i);
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.widthPt} ${A4.heightPt}] ` +
        `/Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`,
    );
    const content = text(`q ${A4.widthPt} 0 0 ${A4.heightPt} 0 0 cm /Im0 Do Q`);
    object(id + 1, `<< /Length ${content.length} >>`, content);
    object(
      id + 2,
      `<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>`,
      p.jpeg,
    );
  });

  const total = 3 + n * 3;
  const xrefAt = length;
  let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let id = 1; id < total; id++) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  push(text(xref));
  push(text(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`));
  return concat(parts);
}
