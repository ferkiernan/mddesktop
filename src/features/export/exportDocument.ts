// Export orchestration (File > Export): capture the current content, let the user pick the export style in the
// export panel (preview = the exact bytes that will be written, spec 005), choose the destination in the native
// dialog and let Rust write it atomically. The Markdown file itself is never touched.
import type { ExportFormat } from "../../services/contracts";
import { toAppError } from "../../services/errors";
import { exports_ } from "../../services/ipc";
import { ask } from "../../ui/dialogs";
import { toast } from "../../ui/Toast";
import { useDocuments } from "../documents/store";
import { buildDocx } from "./docx";
import { openExportPanel } from "./exportPanelStore";
import { buildHtmlPage } from "./htmlPage";
import { buildOdt } from "./odt";
import { buildPdf } from "./pdf";
import { renderPages, type RenderedPage } from "./rasterize";
import { snapshotContent } from "./snapshot";
import { withViewer } from "./viewer";

export const toBase64 = (bytes: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

const stem = (name: string) => name.replace(/\.(md|markdown)$/i, "") || "Documento";

export interface ExportResult {
  path: string;
  bytes: number;
  warnings: string[];
}

export interface BuiltExport {
  bytes: Uint8Array;
  warnings: string[];
  /** Paginated formats rendered as page images (PDF): what the preview shows. */
  pages?: RenderedPage[];
  /** Continuous preview (HTML, and Word/ODT which are paginated by the program that opens them). */
  html?: string;
}

/** Builds the file bytes for `markdown` in `format`; the heavy part of an export. */
export async function buildExport(
  markdown: string,
  format: ExportFormat,
  title: string,
  onProgress: (message: string) => void = () => undefined,
  documentId?: string,
  styleVars?: Record<string, string>,
  signal?: { cancelled: boolean },
): Promise<BuiltExport> {
  onProgress("Preparando…");
  return withViewer(
    markdown,
    async ({ content, background }) => {
      const snap = await snapshotContent(content, background);
      const page = buildHtmlPage(snap, title);
      if (format === "html") return { bytes: new TextEncoder().encode(page), warnings: snap.warnings, html: page };
      if (format === "docx" || format === "odt") {
        const { buildNativeDocument } = await import("./native/build");
        const bytes = await buildNativeDocument(format, content, title, snap, (m) => onProgress(m));
        return { bytes: bytes.bytes, warnings: [...snap.warnings, ...bytes.warnings], html: page };
      }
      const rendered = await renderPages(snap, (n, total) => onProgress(`Página ${n} de ${total}…`), signal);
      return { bytes: buildPdf(rendered.pages), warnings: [...snap.warnings, ...rendered.warnings], pages: rendered.pages };
    },
    documentId,
    styleVars,
  );
}

/** Legacy page-image writers, kept for tests and as a reference of the 002 behaviour. */
export const pageImageWriters = { docx: buildDocx, odt: buildOdt };

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
  if (doc.compare) toast("Hay una comparación pendiente: se exporta la versión de la aplicación", 5000); // spec 008

  try {
    const built = await openExportPanel({ format, markdown, title, documentId: doc.id });
    if (!built) return null; // panel cancelled: no file, no change

    const path = await exports_.pickPath(format, title);
    if (!path) return null; // save dialog cancelled (FR-008)

    toast("Exportando: guardando…", 60_000);
    const written = await exports_.write(path, toBase64(built.bytes));
    toast(`Exportado: ${path}`, 6000);
    if (built.warnings.length) {
      await ask({
        title: "Exportación completada con avisos",
        message: built.warnings.join("\n"),
        buttons: [{ label: "Aceptar", value: "ok", primary: true }],
      });
    }
    return { path, bytes: written.bytes, warnings: built.warnings };
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
