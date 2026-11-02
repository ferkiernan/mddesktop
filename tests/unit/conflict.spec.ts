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

describe("external change resolution (FR-014)", () => {
  it("option 1 - overwrite: force-saves local content", async () => {
    ipc = installMockIpc({ write_document: () => ({ fingerprint: fp(3) }) });
    const id = openDirty();
    askMock.mockResolvedValue("overwrite");
    expect(await resolveExternalChange(id)).toBe(true);
    const req = ipc.calls[0].args?.request as { overwriteExternal: boolean; content: string };
    expect([req.overwriteExternal, req.content]).toEqual([true, "mis cambios\n"]);
    expect(useDocuments.getState().docs[id].isDirty).toBe(false);
  });

  it("option 2 - new tab: disk version opens as an untitled doc, original untouched", async () => {
    ipc = installMockIpc({ read_document: () => disk("del disco\n") });
    const id = openDirty();
    askMock.mockResolvedValue("newtab");
    await resolveExternalChange(id);
    const { docs, order } = useDocuments.getState();
    expect(order).toHaveLength(2);
    const created = docs[order[1]];
    expect([created.filePath, created.content]).toEqual([null, "del disco\n"]);
    expect(docs[id].content).toBe("mis cambios\n");
    expect(docs[id].isDirty).toBe(true);
  });

  it("option 3 - reload here: replaces content, remounts and keeps an undo snapshot", async () => {
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

  it("a clean document is only offered a reload; Ignorar keeps it flagged", async () => {
    const id = useDocuments.getState().addOpened(disk("original\n", 1) as never);
    askMock.mockResolvedValue("ignore");
    await resolveExternalChange(id);
    expect(useDocuments.getState().docs[id].externalState).toBe("modified");
    expect(askMock.mock.calls[0][0].buttons.map((b: { value: string }) => b.value)).toEqual(["ignore", "reload"]);
  });

  it("removed files are flagged without prompting", async () => {
    const id = useDocuments.getState().addOpened(disk("x\n", 1) as never);
    await resolveExternalChange(id, true);
    expect(useDocuments.getState().docs[id].externalState).toBe("removed");
    expect(askMock).not.toHaveBeenCalled();
  });

  it("saving a stale file routes EXTERNAL_CONFLICT to the conflict dialog", async () => {
    ipc = installMockIpc({
      write_document: () => Promise.reject({ code: "EXTERNAL_CONFLICT", message: "changed" }),
    });
    const id = openDirty();
    askMock.mockResolvedValue("cancel");
    expect(await save(id)).toBe(false);
    expect(askMock.mock.calls[0][0].title).toMatch(/Conflicto/);
  });

  it("does not prompt twice for the same disk state", async () => {
    const id = useDocuments.getState().addOpened(disk("x\n", 1) as never);
    useDocuments.getState().setExternalState(id, "modified");
    await handleExternalChange({ path: "C:\\a.md", kind: "modified", fingerprint: fp(1) });
    expect(askMock).not.toHaveBeenCalled();
  });
});
