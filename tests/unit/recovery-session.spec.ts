import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const askMock = vi.hoisted(() => vi.fn());
vi.mock("../../src/ui/dialogs", () => ({ ask: askMock }));
vi.mock("../../src/ui/Toast", () => ({ toast: vi.fn() }));

import { useDocuments } from "../../src/features/documents/store";
import { _resetRecoveryForTests, startRecoveryWriter } from "../../src/features/session/recoveryWriter";
import { _resetRestoreForTests, restoreSession } from "../../src/features/session/restore";
import { buildSession } from "../../src/features/session/sessionManager";
import { installMockIpc } from "../helpers/mockIpc";

const fp = (h: string) => ({ mtimeMs: 1, size: 1, hash: h });
const disk = (path: string, content: string, hash = "h1") => ({
  path,
  content,
  encoding: "utf-8",
  bom: false,
  eol: "lf",
  fingerprint: fp(hash),
});
let ipc: ReturnType<typeof installMockIpc> | undefined;

beforeEach(() => {
  useDocuments.setState({ docs: {}, order: [], activeId: null, untitledCounter: 0 });
  askMock.mockReset();
  _resetRecoveryForTests();
  _resetRestoreForTests();
});
afterEach(() => {
  ipc?.restore();
  vi.useRealTimers();
});

describe("recovery writer (FR-020a)", () => {
  it("writes ~4 s after the last change, not before, and never without changes", async () => {
    vi.useFakeTimers();
    ipc = installMockIpc({ recovery_write: () => null, recovery_delete: () => null });
    const stop = startRecoveryWriter(4000);
    const id = useDocuments.getState().newDocument();
    useDocuments.getState().setContent(id, "a");
    await vi.advanceTimersByTimeAsync(3000);
    useDocuments.getState().setContent(id, "ab"); // resets the debounce
    await vi.advanceTimersByTimeAsync(3000);
    expect(ipc.calls.filter((c) => c.cmd === "recovery_write")).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1500);
    const writes = ipc.calls.filter((c) => c.cmd === "recovery_write");
    expect(writes).toHaveLength(1);
    expect((writes[0].args?.entry as { content: string }).content).toBe("ab");
    await vi.advanceTimersByTimeAsync(60000);
    expect(ipc.calls.filter((c) => c.cmd === "recovery_write")).toHaveLength(1);
    stop();
  });

  it("flushes immediately when leaving the tab and deletes the entry once saved", async () => {
    vi.useFakeTimers();
    ipc = installMockIpc({ recovery_write: () => null, recovery_delete: () => null });
    const stop = startRecoveryWriter(4000);
    const a = useDocuments.getState().newDocument();
    useDocuments.getState().setContent(a, "pendiente");
    const b = useDocuments.getState().newDocument(); // activates b -> flush a
    await vi.advanceTimersByTimeAsync(0);
    expect(ipc.calls.filter((c) => c.cmd === "recovery_write")).toHaveLength(1);
    useDocuments.getState().markSaved(a, { content: "pendiente", fingerprint: fp("x"), filePath: "C:\\a.md" });
    await vi.advanceTimersByTimeAsync(0);
    expect(ipc.calls.some((c) => c.cmd === "recovery_delete" && c.args?.documentId === a)).toBe(true);
    void b;
    stop();
  });
});

describe("session restore (FR-021)", () => {
  const entry = (documentId: string, filePath: string | null, content: string, hash = "h1") => ({
    documentId,
    filePath,
    baseFingerprint: fp(hash),
    eol: "lf",
    encoding: "utf-8",
    bom: false,
    writtenAt: 1,
    content,
  });

  it("restores tabs and the active one; recovers unsaved edits over the disk version", async () => {
    ipc = installMockIpc({
      session_load: () => ({
        version: 1,
        savedAt: 1,
        activeDocumentId: "doc-b",
        tabs: [
          { documentId: "doc-a", filePath: "C:\\a.md", fingerprint: fp("h1"), hasRecovery: true },
          { documentId: "doc-b", filePath: "C:\\b.md", fingerprint: fp("h2"), hasRecovery: false },
        ],
      }),
      recovery_list: () => [entry("doc-a", "C:\\a.md", "editado sin guardar")],
      read_document: (a) => disk(String(a?.path), `disco ${a?.path}`),
      recovery_write: () => null,
      recovery_delete: () => null,
    });
    await restoreSession();
    const { docs, order, activeId } = useDocuments.getState();
    expect(order).toHaveLength(2);
    const a = Object.values(docs).find((d) => d.filePath === "C:\\a.md")!;
    const b = Object.values(docs).find((d) => d.filePath === "C:\\b.md")!;
    expect([a.content, a.isDirty, a.savedContent]).toEqual(["editado sin guardar", true, "disco C:\\a.md"]);
    expect(b.isDirty).toBe(false);
    expect(activeId).toBe(b.id);
    expect(ipc.calls.some((c) => c.cmd === "recovery_delete" && c.args?.documentId === "doc-a")).toBe(true);
    expect(askMock).not.toHaveBeenCalled();
  });

  it("flags the document when the file changed on disk while the app was closed", async () => {
    ipc = installMockIpc({
      session_load: () => ({
        version: 1, savedAt: 1, activeDocumentId: null,
        tabs: [{ documentId: "doc-a", filePath: "C:\\a.md", fingerprint: fp("h1"), hasRecovery: true }],
      }),
      recovery_list: () => [entry("doc-a", "C:\\a.md", "mi version", "h1")],
      read_document: () => disk("C:\\a.md", "otra version", "h9"),
      recovery_write: () => null,
      recovery_delete: () => null,
      // the disk now has h9: a save that still expects h1 is a conflict
      write_document: (a) => ((a?.expectedFingerprint as { hash?: string } | null)?.hash === "h9"
        ? { fingerprint: fp("h10") }
        : Promise.reject({ code: "EXTERNAL_CONFLICT", message: "changed" })),
    });
    askMock.mockResolvedValue("ignore");
    await restoreSession();
    const d = Object.values(useDocuments.getState().docs)[0];
    expect(d.externalState).toBe("modified");
    expect(d.content).toBe("mi version");
    // spec 008 FR-012: the old fingerprint is kept (a save detects the conflict) and the dialog is offered
    expect(d.fingerprint?.hash).toBe("h1");
    await vi.waitFor(() => expect(askMock).toHaveBeenCalled());
    expect(askMock.mock.calls[0][0].buttons.map((b: { value: string }) => b.value)).toEqual(["ignore", "reload", "compare"]);
    // "Ignorar cambios" + Guardar asks before replacing the disk version
    const { save } = await import("../../src/features/documents/actions");
    askMock.mockReset();
    askMock.mockResolvedValue("cancel");
    expect(await save(d.id)).toBe(false);
    expect(askMock.mock.calls[0][0].title).toMatch(/Reemplazar/);
  });

  it("recovers untitled documents and orphan entries automatically", async () => {
    const base = {
      session_load: () => ({
        version: 1, savedAt: 1, activeDocumentId: "doc-u",
        tabs: [{ documentId: "doc-u", filePath: null, fingerprint: null, hasRecovery: true }],
      }),
      recovery_list: () => [entry("doc-u", null, "sin titulo"), entry("doc-orphan", null, "huerfano")],
      recovery_write: () => null,
      recovery_delete: () => null,
    };
    ipc = installMockIpc(base);
    await restoreSession();
    const docs = Object.values(useDocuments.getState().docs);
    expect(docs.map((d) => d.content).sort()).toEqual(["huerfano", "sin titulo"]);
    expect(docs.every((d) => d.isDirty)).toBe(true); // everything comes back as "modified"
    expect(askMock).not.toHaveBeenCalled(); // no recovery prompt: the user decides about saving later
  });

  it("starts clean when there is no previous session", async () => {
    ipc = installMockIpc({ session_load: () => null, recovery_list: () => [] });
    await restoreSession();
    expect(useDocuments.getState().order).toHaveLength(0);
    expect(askMock).not.toHaveBeenCalled();
  });
});

describe("session snapshot", () => {
  it("keeps saved files and dirty untitled docs, skips empty untitled ones", () => {
    const s = useDocuments.getState();
    s.addOpened(disk("C:\\a.md", "x") as never);
    const empty = s.newDocument();
    const dirty = s.newDocument();
    useDocuments.getState().setContent(dirty, "algo");
    const snap = buildSession();
    expect(snap.tabs.map((t) => t.documentId)).not.toContain(empty);
    expect(snap.tabs).toHaveLength(2);
    expect(snap.activeDocumentId).toBe(dirty);
  });
});
