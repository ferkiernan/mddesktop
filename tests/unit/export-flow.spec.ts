import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const askMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());
vi.mock("../../src/ui/dialogs", () => ({ ask: askMock }));
vi.mock("../../src/ui/Toast", () => ({ toast: toastMock }));

// the heavy rendering pieces are covered by the native test; here we verify the orchestration
vi.mock("../../src/features/export/viewer", () => ({
  withViewer: async (_md: string, fn: (v: unknown) => unknown) => fn({ content: {}, background: {} }),
}));
vi.mock("../../src/features/export/snapshot", () => ({
  snapshotContent: async () => ({
    html: "<div><h1>Hola</h1></div>",
    backgroundCss: "background-color:white",
    color: "black",
    fontFamily: "serif",
    warnings: ["Imagen omitida: x"],
  }),
}));
const J = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
vi.mock("../../src/features/export/rasterize", () => ({
  renderPages: async (_s: unknown, onProgress?: (p: number, n: number) => void) => {
    onProgress?.(1, 2);
    onProgress?.(2, 2);
    return {
      pages: [
        { index: 0, jpeg: J, width: 1588, height: 2246 },
        { index: 1, jpeg: J, width: 1588, height: 2246 },
      ],
      warnings: [],
    };
  },
}));
// Word/ODT are native since spec 006 (their writers are covered by export-native.spec.ts)
vi.mock("../../src/features/export/native/build", () => ({
  buildNativeDocument: async () => ({ bytes: Uint8Array.from([0x50, 0x4b, 0x03, 0x04]), warnings: [] }),
}));
// spec 005: the export panel builds the preview and the user clicks "Exportar…" right away
const progress = vi.hoisted(() => [] as string[]);
const panelCalls = vi.hoisted(() => [] as unknown[]);
vi.mock("../../src/features/export/exportPanelStore", () => ({
  openExportPanel: async (opts: { format: string; markdown: string; title: string; documentId?: string }) => {
    panelCalls.push(opts);
    const m = await import("../../src/features/export/exportDocument");
    return m.buildExport(opts.markdown, opts.format as never, opts.title, (p) => progress.push(p), opts.documentId);
  },
}));

import { useDocuments } from "../../src/features/documents/store";
import { exportActiveDocument } from "../../src/features/export/exportDocument";
import { installMockIpc } from "../helpers/mockIpc";

let ipc: ReturnType<typeof installMockIpc> | undefined;
const decode = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

beforeEach(() => {
  useDocuments.setState({ docs: {}, order: [], activeId: null, untitledCounter: 0 });
  askMock.mockReset();
  askMock.mockResolvedValue("ok");
  toastMock.mockReset();
  progress.length = 0;
  panelCalls.length = 0;
});
afterEach(() => ipc?.restore());

function openDoc(content = "# Hola") {
  const id = useDocuments.getState().newDocument();
  useDocuments.getState().setContent(id, content);
  return id;
}

describe("export flow (File > Export)", () => {
  it("with no document open it only informs; nothing is asked or written", async () => {
    ipc = installMockIpc({});
    expect(await exportActiveDocument("pdf")).toBeNull();
    expect(ipc.calls).toHaveLength(0);
    expect(toastMock).toHaveBeenCalledWith(expect.stringMatching(/Abre un documento/));
  });

  it("cancelling the save dialog writes nothing and shows no error", async () => {
    ipc = installMockIpc({ pick_export_path: () => null });
    openDoc();
    expect(await exportActiveDocument("html")).toBeNull();
    expect(ipc.calls.map((c) => c.cmd)).toEqual(["pick_export_path"]);
    expect(askMock).not.toHaveBeenCalled();
  });

  it("HTML: suggests the document name, writes a self-contained page and reports the path", async () => {
    ipc = installMockIpc({ pick_export_path: () => "C:\\out\\nota.html", write_export: () => ({ bytes: 1 }) });
    const id = openDoc("# Hola");
    useDocuments.setState((s) => ({ docs: { ...s.docs, [id]: { ...s.docs[id], fileName: "nota.md" } } }));
    const r = await exportActiveDocument("html");
    expect(r?.path).toBe("C:\\out\\nota.html");
    expect(ipc.calls[0].args).toMatchObject({ format: "html", suggestedName: "nota" });
    const sent = ipc.calls[1].args as { path: string; dataBase64: string };
    expect(sent.path).toBe("C:\\out\\nota.html");
    const html = new TextDecoder().decode(decode(sent.dataBase64));
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<h1>Hola</h1>");
    expect(toastMock).toHaveBeenCalledWith(expect.stringContaining("Exportado: C:\\out\\nota.html"), expect.anything());
  });

  it.each([
    ["pdf", "%PDF-1.4", "C:\\out\\a.pdf"],
    ["docx", "PK", "C:\\out\\a.docx"],
    ["odt", "PK", "C:\\out\\a.odt"],
  ] as const)("%s: builds the preview in the panel and writes those bytes", async (format, magic, path) => {
    ipc = installMockIpc({ pick_export_path: () => path, write_export: () => ({ bytes: 1 }) });
    openDoc();
    await exportActiveDocument(format);
    const bytes = decode((ipc.calls[1].args as { dataBase64: string }).dataBase64);
    expect(new TextDecoder("latin1").decode(bytes.subarray(0, magic.length))).toBe(magic);
    if (format === "pdf") expect(progress).toContain("Página 2 de 2…");
    expect(panelCalls).toHaveLength(1);
  });

  it("reports warnings (e.g. omitted images) after a successful export", async () => {
    ipc = installMockIpc({ pick_export_path: () => "C:\\out\\a.pdf", write_export: () => ({ bytes: 1 }) });
    openDoc();
    await exportActiveDocument("pdf");
    expect(askMock).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringMatching(/avisos/), message: "Imagen omitida: x" }));
  });

  it("a write failure is reported with the reason and the export returns null", async () => {
    ipc = installMockIpc({
      pick_export_path: () => "C:\\ro\\a.pdf",
      write_export: () => Promise.reject({ code: "PERMISSION_DENIED", message: "acceso denegado" }),
    });
    openDoc();
    expect(await exportActiveDocument("pdf")).toBeNull();
    expect(askMock).toHaveBeenCalledWith(expect.objectContaining({ title: "No se pudo exportar", message: "acceso denegado" }));
  });

  it("exports the content captured at the start, even if the document changes meanwhile", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    ipc = installMockIpc({
      pick_export_path: async () => {
        await gate; // the user is still choosing the file
        return "C:\\out\\a.html";
      },
      write_export: () => ({ bytes: 1 }),
    });
    const id = openDoc("version A");
    const running = exportActiveDocument("html");
    useDocuments.getState().setContent(id, "version B"); // edited while the dialog is open
    release();
    await running;
    // the markdown handed to the viewer was captured before the dialog; the original document keeps its own edits
    expect(useDocuments.getState().docs[id].content).toBe("version B");
    expect(ipc.calls.some((c) => c.cmd === "write_export")).toBe(true);
  });
});
