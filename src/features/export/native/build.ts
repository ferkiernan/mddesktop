// Native Word / OpenDocument export (spec 006): structured document from the rendered viewer, then the writer.
import type { Snapshot } from "../snapshot";
import { buildNativeDocx } from "./docx";
import { buildModel } from "./model";
import { buildNativeOdt } from "./odt";

export async function buildNativeDocument(
  format: "docx" | "odt",
  content: HTMLElement,
  title: string,
  snap: Snapshot,
  onProgress: (message: string) => void = () => undefined,
): Promise<{ bytes: Uint8Array; warnings: string[] }> {
  onProgress("Convirtiendo el contenido…");
  const pageBg = /background-color:([^;]+)/.exec(snap.backgroundCss)?.[1] ?? "#ffffff";
  const model = await buildModel(content, title, pageBg);
  if (model.theme.dark) {
    model.warnings.push(
      format === "docx"
        ? "El estilo es oscuro: el documento usa color de página. Word no lo imprime salvo que se active Opciones > Mostrar > Imprimir colores e imágenes de fondo."
        : "El estilo es oscuro: el documento usa color de página; actívalo en las opciones de impresión si quieres imprimirlo.",
    );
  }
  onProgress("Generando el archivo…");
  const bytes = format === "docx" ? buildNativeDocx(model) : buildNativeOdt(model);
  return { bytes, warnings: model.warnings };
}
