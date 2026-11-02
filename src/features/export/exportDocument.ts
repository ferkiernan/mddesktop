// Export orchestration (File > Export): capture the current content, choose the destination in the
// native dialog, render it with the same viewer and style the user sees, build the file, and let
// Rust write it atomically. The Markdown file itself is never touched.
import type { ExportFormat } from "../../services/contracts";
import { toAppError } from "../../services/errors";
import { exports_ } from "../../services/ipc";
import { ask } from "../../ui/dialogs";
import { toast } from "../../ui/Toast";
import { useDocuments } from "../documents/store";
import { buildDocx } from "./docx";
import { buildHtmlPage } from "./htmlPage";
import { buildOdt } from "./odt";
import { buildPdf } from "./pdf";
import { renderPages } from "./rasterize";
import { snapshotContent } from "./snapshot";
import { withViewer } from "./viewer";

export const toBase64 = (bytes: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

const stem = (name: string) => name.replace(/\.(md|markdown)$/i, "") || "Documento";
const LONG = 60_000; // progress toasts stay until replaced

export interface ExportResult {
  path: string;
  bytes: number;
  warnings: string[];
}

/** Builds the file bytes for `markdown` in `format`; the heavy part of an export. */
export async function buildExport(
  markdown: string,
  format: ExportFormat,
  title: string,
  onProgress: (message: string) => void = () => undefined,
  documentId?: string,
): Promise<{ bytes: Uint8Array; warnings: string[] }> {
  onProgress("Preparando…");
  return withViewer(
    markdown,
    async ({ content, background }) => {
    const snap = await snapshotContent(content, background);
    if (format === "html") return { bytes: new TextEncoder().encode(buildHtmlPage(snap, title)), warnings: snap.warnings };

    const pages = await renderPages(snap, (page, total) => onProgress(`Página ${page} de ${total}…`));
    const bytes = format === "pdf" ? buildPdf(pages) : format === "docx" ? buildDocx(pages) : buildOdt(pages);
    return { bytes, warnings: snap.warnings };
    },
    documentId,
  );
}

/** Menu entry point. Resolves with the result, or null when nothing was written (cancelled / no document). */
export async function exportActiveDocument(format: ExportFormat): Promise<ExportResult | null> {
  const { activeId, docs } = useDocuments.getState();
  const doc = activeId ? docs[activeId] : null;
  if (!doc) {
    toast("Abre un documento para exportarlo");
    return null;
  }
  // captured now: later edits or tab changes do not affect this export (spec edge case)
  const markdown = doc.content;
  const title = stem(doc.fileName);

  try {
    const path = await exports_.pickPath(format, title);
    if (!path) return null; // cancelled: no file, no error (FR-008)

    const { bytes, warnings } = await buildExport(markdown, format, title, (m) => toast(`Exportando: ${m}`, LONG), doc.id);
    toast("Exportando: guardando…", LONG);
    const written = await exports_.write(path, toBase64(bytes));
    toast(`Exportado: ${path}`, 6000);
    if (warnings.length) {
      await ask({
        title: "Exportación completada con avisos",
        message: warnings.join("\n"),
        buttons: [{ label: "Aceptar", value: "ok", primary: true }],
      });
    }
    return { path, bytes: written.bytes, warnings };
  } catch (e) {
    toast("La exportación falló", 3000);
    await ask({
      title: "No se pudo exportar",
      message: toAppError(e).message,
      buttons: [{ label: "Aceptar", value: "ok", primary: true }],
    });
    return null;
  }
}
