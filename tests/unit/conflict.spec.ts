import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const askMock = vi.hoisted(() => vi.fn());
vi.mock("../../src/ui/dialogs", () => ({ ask: askMock }));
vi.mock("../../src/ui/Toast", () => ({ toast: vi.fn() }));

import { useDocuments } from "../../src/features/documents/store";
import { save } from "../../src/features/documents/actions";
import { resolveExternalChange } from "../../src/features/documents/conflictActions";
import { handleExternalChange } from "../../src/features/documents/externalChanges";
import { startReloadUndo } from "../../src/features/editor/reloadUndo";
import { installMockIpc } from "../helpers/mockIpc";

const fp = (n: number) => ({ mtimeMs: n, size: n, hash: `h${n}` });
const disk = (content: string, n = 2) => ({
  path: "C:\\a.md",
  content,
  encoding: "utf-8",
  bom: false,
  eol: "lf",
  fingerprint: fp(n),
});

let ipc: ReturnType<typeof installMockIpc> | undefined;

function openDirty() {
  const id = useDocuments.getState().addOpened(disk("original\n", 1) as never);
  useDocuments.getState().setContent(id, "mis cambios\n");
  return id;
}

beforeEach(() => {
  useDocuments.setState({ docs: {}, order: [], activeId: null, untitledCounter: 0 });
  askMock.mockReset();
});
afterEach(() => ipc?.restore());

describe("external change resolution (spec 008, replaces 001 FR-014)", () => {
  it("one dialog with Ignorar cambios (Escape) / Abrir de nuevo / Comparar (primary), with or without local changes", async () => {
    ipc = installMockIpc({ read_document: () => disk("del disco\n") });
    const id = openDirty();
    askMock.mockResolvedValue("ignore");
    await resolveExternalChange(id);
    const opts = askMock.mock.calls[0][0];
    expect(opts.buttons.map((b: { value: string }) => b.value)).toEqual(["ignore", "reload", "compare"]);
    expect(opts.buttons[2].primary).toBe(true);
    expect(opts.message).toMatch(/cambios sin guardar/);
    const d = useDocuments.getState().docs[id];
    expect([d.content, d.externalState, d.ignoredHash]).toEqual(["mis cambios\n", "modified", "h2"]);
  });

  it("Comparar keeps the app content and stores the disk version as the proposal; nothing is written", async () => {
    ipc = installMockIpc({ read_document: () => disk("del disco\n") });
    const id = openDirty();
    askMock.mockResolvedValue("compare");
    await resolveExternalChange(id);
    const d = useDocuments.getState().docs[id];
    expect([d.content, d.compare?.content]).toEqual(["mis cambios\n", "del disco\n"]);
    expect(ipc.calls.some((c) => c.cmd === "write_document")).toBe(false);
  });

  it("accepting the disk version unchanged leaves the document clean; accepting edits leaves it modified; Ctrl+Z data kept", () => {
    const id = openDirty();
    useDocuments.getState().startCompare(id, disk("del disco\n") as never);
    useDocuments.getState().acceptCompare(id, "del disco\n");
    let d = useDocuments.getState().docs[id];
    expect([d.content, d.isDirty, d.compare ?? null, d.reloadSnapshot, d.fingerprint?.hash]).toEqual(["del disco\n", false, null, "mis cambios\n", "h2"]);
    useDocuments.getState().startCompare(id, disk("v3\n", 3) as never);
    useDocuments.getState().acceptCompare(id, "v3 retocado\n");
    d = useDocuments.getState().docs[id];
    expect([d.content, d.isDirty]).toEqual(["v3 retocado\n", true]);
  });

  it("rejecting keeps the app content and the next save asks before replacing the disk version", async () => {
    ipc = installMockIpc({ write_document: () => Promise.reject({ code: "EXTERNAL_CONFLICT", message: "changed" }) });
    const id = openDirty();
    useDocuments.getState().startCompare(id, disk("del disco\n") as never);
    useDocuments.getState().rejectCompare(id);
    expect(useDocuments.getState().docs[id].content).toBe("mis cambios\n");
    askMock.mockResolvedValue("cancel");
    expect(await save(id)).toBe(false);
    expect(askMock.mock.calls[0][0].title).toMatch(/Reemplazar/);
  });

  it("saving during a comparison asks to decide first and writes nothing", async () => {
    ipc = installMockIpc({ write_document: () => ({ fingerprint: fp(9) }) });
    const id = openDirty();
    useDocuments.getState().startCompare(id, disk("del disco\n") as never);
    askMock.mockResolvedValue("ok");
    expect(await save(id)).toBe(false);
    expect(askMock.mock.calls[0][0].title).toMatch(/Comparación pendiente/);
    expect(ipc.calls.some((c) => c.cmd === "write_document")).toBe(false);
  });

  it("no dialog when the disk now has exactly the app content", async () => {
    ipc = installMockIpc({ read_document: () => disk("mis cambios\n", 4) });
    const id = openDirty();
    await resolveExternalChange(id);
    expect(askMock).not.toHaveBeenCalled();
    const d = useDocuments.getState().docs[id];
    expect([d.isDirty, d.fingerprint?.hash]).toEqual([false, "h4"]);
  });

  it("an ignored disk version is not asked again", async () => {
    const id = useDocuments.getState().addOpened(disk("x\n", 1) as never);
    useDocuments.getState().ignoreDiskVersion(id, "h7");
    await handleExternalChange({ path: "C:\\a.md", kind: "modified", fingerprint: fp(7) });
    expect(askMock).not.toHaveBeenCalled();
  });

  it("Abrir de nuevo: replaces content, remounts and keeps an undo snapshot", async () => {
    ipc = installMockIpc({ read_document: () => disk("del disco\n") });
    const id = openDirty();
    askMock.mockResolvedValue("reload");
    await resolveExternalChange(id);
    const d = useDocuments.getState().docs[id];
    expect([d.content, d.isDirty, d.revision, d.reloadSnapshot]).toEqual(["del disco\n", false, 1, "mis cambios\n"]);
  });

  it("Ctrl+Z restores the pre-reload content until the user edits", async () => {
    ipc = installMockIpc({ read_document: () => disk("del disco\n") });
    const stop = startReloadUndo();
    const id = openDirty();
    askMock.mockResolvedValue("reload");
    await resolveExternalChange(id);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true }));
    const d = useDocuments.getState().docs[id];
    expect([d.content, d.isDirty, d.reloadSnapshot]).toEqual(["mis cambios\n", true, null]);
    stop();
  });

  it("an edit after reload discards the snapshot", async () => {
    ipc = installMockIpc({ read_document: () => disk("del disco\n") });
    const id = openDirty();
    askMock.mockResolvedValue("reload");
    await resolveExternalChange(id);
    useDocuments.getState().setContent(id, "nuevo\n");
    expect(useDocuments.getState().docs[id].reloadSnapshot).toBeNull();
  });

  it("removed files are flagged without prompting", async () => {
    const id = useDocuments.getState().addOpened(disk("x\n", 1) as never);
    await resolveExternalChange(id, true);
    expect(useDocuments.getState().docs[id].externalState).toBe("removed");
    expect(askMock).not.toHaveBeenCalled();
  });

  it("does not prompt twice for the same disk state", async () => {
    const id = useDocuments.getState().addOpened(disk("x\n", 1) as never);
    useDocuments.getState().setExternalState(id, "modified");
    await handleExternalChange({ path: "C:\\a.md", kind: "modified", fingerprint: fp(1) });
    expect(askMock).not.toHaveBeenCalled();
  });
});
