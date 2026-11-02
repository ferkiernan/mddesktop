import { beforeEach, describe, expect, it, vi } from "vitest";

const askMock = vi.hoisted(() => vi.fn());
const saveMock = vi.hoisted(() => vi.fn());
vi.mock("../../src/ui/dialogs", () => ({ ask: askMock }));
vi.mock("../../src/ui/Toast", () => ({ toast: vi.fn() }));
vi.mock("../../src/features/documents/actions", () => ({ save: saveMock }));

import { useDocuments } from "../../src/features/documents/store";
import { requestClose, requestCloseAll } from "../../src/features/documents/closeFlow";

function docs(n: number, dirtyIdx: number[] = []) {
  const s = useDocuments.getState();
  return Array.from({ length: n }, (_, i) => {
    const id = s.newDocument();
    if (dirtyIdx.includes(i)) useDocuments.getState().setContent(id, "cambios");
    return id;
  });
}

beforeEach(() => {
  useDocuments.setState({ docs: {}, order: [], activeId: null, untitledCounter: 0 });
  askMock.mockReset();
  saveMock.mockReset();
});

describe("close flow", () => {
  it("closes clean documents without asking", async () => {
    const [a] = docs(1);
    expect(await requestClose([a])).toBe(true);
    expect(askMock).not.toHaveBeenCalled();
    expect(useDocuments.getState().order).toEqual([]);
  });

  it("Cancelar keeps the document and aborts", async () => {
    const [a] = docs(1, [0]);
    askMock.mockResolvedValue("cancel");
    expect(await requestClose([a])).toBe(false);
    expect(useDocuments.getState().order).toEqual([a]);
  });

  it("Descartar closes without saving", async () => {
    const [a] = docs(1, [0]);
    askMock.mockResolvedValue("discard");
    expect(await requestClose([a])).toBe(true);
    expect(saveMock).not.toHaveBeenCalled();
    expect(useDocuments.getState().order).toEqual([]);
  });

  it("Guardar saves first and keeps the tab if the save fails", async () => {
    const [a] = docs(1, [0]);
    askMock.mockResolvedValue("save");
    saveMock.mockResolvedValue(false);
    expect(await requestClose([a])).toBe(false);
    expect(useDocuments.getState().order).toEqual([a]);
    saveMock.mockResolvedValue(true);
    expect(await requestClose([a])).toBe(true);
  });

  it("close all stops at the first Cancelar, leaving later tabs open", async () => {
    const [a, b, c] = docs(3, [1]);
    askMock.mockResolvedValue("cancel");
    expect(await requestCloseAll()).toBe(false);
    expect(useDocuments.getState().order).toEqual([b, c]);
    void a;
  });
});

describe("exit keeps unsaved work in temp storage (no prompt)", () => {
  it("writes recovery for every modified document, saves the session and quits without asking", async () => {
    const { installMockIpc } = await import("../helpers/mockIpc");
    const { requestExit } = await import("../../src/features/documents/closeFlow");
    const ipc = installMockIpc({ recovery_write: () => null, session_save: () => null, confirm_exit: () => null });
    docs(3, [0, 2]);
    await requestExit();
    const cmds = ipc.calls.map((c) => c.cmd);
    expect(cmds.filter((c) => c === "recovery_write")).toHaveLength(2); // only the modified ones
    expect(cmds.indexOf("session_save")).toBeGreaterThan(cmds.lastIndexOf("recovery_write"));
    expect(cmds.at(-1)).toBe("confirm_exit");
    expect(askMock).not.toHaveBeenCalled();
    expect(useDocuments.getState().order).toHaveLength(3); // tabs untouched; state comes back on next launch
    ipc.restore();
  });

  it("quits straight away when nothing is modified", async () => {
    const { installMockIpc } = await import("../helpers/mockIpc");
    const { requestExit } = await import("../../src/features/documents/closeFlow");
    const ipc = installMockIpc({ session_save: () => null, confirm_exit: () => null });
    docs(2);
    await requestExit();
    expect(ipc.calls.map((c) => c.cmd)).toEqual(["session_save", "confirm_exit"]);
    ipc.restore();
  });

  it("if the recovery write fails it falls back to asking and keeps the app open on Cancelar", async () => {
    const { installMockIpc } = await import("../helpers/mockIpc");
    const { requestExit } = await import("../../src/features/documents/closeFlow");
    const ipc = installMockIpc({
      recovery_write: () => Promise.reject({ code: "DISK_FULL", message: "disk full" }),
      confirm_exit: () => null,
    });
    docs(1, [0]);
    askMock.mockResolvedValue("cancel");
    await requestExit();
    expect(askMock).toHaveBeenCalled();
    expect(ipc.calls.some((c) => c.cmd === "confirm_exit")).toBe(false);
    ipc.restore();
  });
});
