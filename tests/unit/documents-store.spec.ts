import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const askMock = vi.hoisted(() => vi.fn());
vi.mock("../../src/ui/dialogs", () => ({ ask: askMock }));
vi.mock("../../src/ui/Toast", () => ({ toast: vi.fn() }));

import { useDocuments } from "../../src/features/documents/store";
import { openFiles, save, saveAs } from "../../src/features/documents/actions";
import { installMockIpc } from "../helpers/mockIpc";

const fp = (n = 1) => ({ mtimeMs: n, size: 3, hash: `h${n}` });
const readResult = (path: string, content = "hola\n") => ({
  path,
  content,
  encoding: "utf-8",
  bom: false,
  eol: "lf",
  fingerprint: fp(),
});

let ipc: ReturnType<typeof installMockIpc> | undefined;

beforeEach(() => {
  useDocuments.setState({ docs: {}, order: [], activeId: null, untitledCounter: 0 });
  askMock.mockReset();
});
afterEach(() => ipc?.restore());

describe("documents store", () => {
  it("creates new documents without a path", () => {
    const id = useDocuments.getState().newDocument();
    const d = useDocuments.getState().docs[id];
    expect(d.filePath).toBeNull();
    expect(d.fileName).toBe("Sin título 1");
    expect(useDocuments.getState().activeId).toBe(id);
  });

  it("derives isDirty from content vs savedContent", () => {
    const id = useDocuments.getState().addOpened(readResult("C:\\a.md") as never);
    const { setContent } = useDocuments.getState();
    setContent(id, "cambiado");
    expect(useDocuments.getState().docs[id].isDirty).toBe(true);
    setContent(id, "hola\n");
    expect(useDocuments.getState().docs[id].isDirty).toBe(false);
  });

  it("does not duplicate a file that is already open (case-insensitive)", () => {
    const a = useDocuments.getState().addOpened(readResult("C:\\Docs\\a.md") as never);
    const b = useDocuments.getState().addOpened(readResult("c:\\docs\\A.md") as never);
    expect(b).toBe(a);
    expect(useDocuments.getState().order).toHaveLength(1);
  });
});

describe("document actions", () => {
  it("opens a picked file and activates the existing tab on re-open", async () => {
    ipc = installMockIpc({
      pick_open_files: () => ["C:\\a.md"],
      read_document: () => readResult("C:\\a.md"),
    });
    await openFiles();
    await openFiles();
    expect(useDocuments.getState().order).toHaveLength(1);
    expect(ipc.calls.filter((c) => c.cmd === "read_document")).toHaveLength(1);
  });

  it("asks before opening large files and honors Cancel", async () => {
    ipc = installMockIpc({
      read_document: () => Promise.reject({ code: "TOO_LARGE", message: "big", details: { size: 9e6 } }),
    });
    askMock.mockResolvedValueOnce("cancel");
    await openFiles(["C:\\big.md"]);
    expect(useDocuments.getState().order).toHaveLength(0);
    expect(ipc.calls).toHaveLength(1);
  });

  it("opens large files after confirmation", async () => {
    let first = true;
    ipc = installMockIpc({
      read_document: (a) => {
        if (first) {
          first = false;
          return Promise.reject({ code: "TOO_LARGE", message: "big", details: { size: 9e6 } });
        }
        expect(a?.acceptLarge).toBe(true);
        return readResult("C:\\big.md");
      },
    });
    askMock.mockResolvedValueOnce("open");
    await openFiles(["C:\\big.md"]);
    expect(useDocuments.getState().order).toHaveLength(1);
  });

  it("save writes with the expected fingerprint and clears the dirty flag", async () => {
    ipc = installMockIpc({ write_document: () => ({ fingerprint: fp(2) }) });
    const id = useDocuments.getState().addOpened(readResult("C:\\a.md") as never);
    useDocuments.getState().setContent(id, "nuevo\n");
    expect(await save(id)).toBe(true);
    const sent = ipc.calls[0].args?.request as { expectedFingerprint: unknown; content: string };
    expect(sent.expectedFingerprint).toEqual(fp());
    expect(sent.content).toBe("nuevo\n");
    const d = useDocuments.getState().docs[id];
    expect(d.isDirty).toBe(false);
    expect(d.fingerprint).toEqual(fp(2));
  });

  it("save on a new document goes through Save As and renames the tab", async () => {
    ipc = installMockIpc({
      pick_save_path: () => "C:\\docs\\nota.md",
      write_document: () => ({ fingerprint: fp(3) }),
    });
    const id = useDocuments.getState().newDocument();
    useDocuments.getState().setContent(id, "# hola");
    expect(await save(id)).toBe(true);
    const d = useDocuments.getState().docs[id];
    expect([d.filePath, d.fileName, d.isDirty]).toEqual(["C:\\docs\\nota.md", "nota.md", false]);
    expect((ipc.calls[1].args?.request as { overwriteExternal: boolean }).overwriteExternal).toBe(true);
  });

  it("Save As refuses a path open in another tab", async () => {
    ipc = installMockIpc({ pick_save_path: () => "C:\\a.md", write_document: () => ({ fingerprint: fp() }) });
    useDocuments.getState().addOpened(readResult("C:\\a.md") as never);
    const other = useDocuments.getState().newDocument();
    askMock.mockResolvedValue("ok");
    expect(await saveAs(other)).toBe(false);
    expect(ipc.calls.some((c) => c.cmd === "write_document")).toBe(false);
  });

  it("asks for consent before converting to UTF-8 and retries", async () => {
    let n = 0;
    ipc = installMockIpc({
      write_document: () =>
        n++ === 0
          ? Promise.reject({ code: "ENCODING_CONVERSION_REQUIRED", message: "convert" })
          : { fingerprint: fp(4) },
    });
    const r = { ...readResult("C:\\a.md"), encoding: "windows-1252" };
    const id = useDocuments.getState().addOpened(r as never);
    useDocuments.getState().setContent(id, "x");
    askMock.mockResolvedValueOnce("convert");
    expect(await save(id)).toBe(true);
    expect(useDocuments.getState().docs[id].encoding).toBe("utf-8");
  });
});
