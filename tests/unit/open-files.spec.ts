import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const askMock = vi.hoisted(() => vi.fn());
vi.mock("../../src/ui/dialogs", () => ({ ask: askMock }));
vi.mock("../../src/ui/Toast", () => ({ toast: vi.fn() }));

import { useDocuments } from "../../src/features/documents/store";
import { openFiles } from "../../src/features/documents/actions";
import { installMockIpc } from "../helpers/mockIpc";

const read = (path: string) => ({
  path, content: `# ${path}`, encoding: "utf-8", bom: false, eol: "lf",
  fingerprint: { mtimeMs: 1, size: 1, hash: "h" },
});
let ipc: ReturnType<typeof installMockIpc> | undefined;

beforeEach(() => {
  useDocuments.setState({ docs: {}, order: [], activeId: null, untitledCounter: 0 });
  askMock.mockReset();
  askMock.mockResolvedValue("ok");
});
afterEach(() => ipc?.restore());

describe("opening files that arrive from the OS (argv / second instance / drop)", () => {
  it("opens each path once and activates the last one", async () => {
    ipc = installMockIpc({ read_document: (a) => read(String(a?.path)) });
    await openFiles(["C:\\a.md", "C:\\b.md", "C:\\A.md"]); // A.md is a case-insensitive duplicate
    const { order, docs, activeId } = useDocuments.getState();
    expect(order).toHaveLength(2);
    expect(docs[activeId!].filePath).toBe("C:\\a.md"); // duplicate re-activated the first tab
    expect(ipc.calls.filter((c) => c.cmd === "read_document")).toHaveLength(2);
  });

  it("keeps going after a file that cannot be read and reports it", async () => {
    ipc = installMockIpc({
      read_document: (a) =>
        a?.path === "C:\\bad.md"
          ? Promise.reject({ code: "NOT_FOUND", message: "no existe" })
          : read(String(a?.path)),
    });
    await openFiles(["C:\\bad.md", "C:\\ok.md"]);
    expect(useDocuments.getState().order).toHaveLength(1);
    expect(askMock).toHaveBeenCalledTimes(1);
    expect(askMock.mock.calls[0][0].message).toBe("no existe");
  });

  it("reports an authorization failure instead of opening", async () => {
    ipc = installMockIpc({
      read_document: () => Promise.reject({ code: "NOT_AUTHORIZED", message: "path was not authorized" }),
    });
    await openFiles(["C:\\secret.md"]);
    expect(useDocuments.getState().order).toHaveLength(0);
    expect(askMock).toHaveBeenCalled();
  });
});
