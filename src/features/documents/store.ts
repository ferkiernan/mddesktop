import { create } from "zustand";
import type { FileFingerprint, ReadResult } from "../../services/contracts";
import { fileNameOf, pathKey, type EditorDocument } from "./types";

interface DocumentsState {
  docs: Record<string, EditorDocument>;
  order: string[];
  activeId: string | null;
  untitledCounter: number;
  newDocument(): string;
  /** Adds an opened file, or activates the existing tab for the same path (FR-003). */
  addOpened(r: ReadResult): string;
  findByPath(path: string): EditorDocument | undefined;
  setContent(id: string, content: string): void;
  /** The editor re-serialized an unedited document: remember that form as the clean baseline. */
  noteCanonical(id: string, markdown: string): void;
  markSaved(id: string, saved: { content: string; fingerprint: FileFingerprint; filePath?: string; encoding?: string; bom?: boolean }): void;
  setActive(id: string): void;
  close(id: string): void;
  /** Moves a tab to `toIndex` in the order (drag and drop reorder). */
  move(id: string, toIndex: number): void;
  /** Adds an unsaved document (no path) with the given content, e.g. the on-disk version after a conflict. */
  addUntitled(name: string, content: string): string;
  setExternalState(id: string, state: EditorDocument["externalState"]): void;
  /** Replaces the content with the disk version, remounting the editor and keeping an undo snapshot. */
  reloadFromDisk(id: string, r: ReadResult): void;
  /** Ctrl+Z fallback: puts back the pre-reload content. Returns false when there is nothing to restore. */
  restoreSnapshot(id: string): boolean;
  /** Spec 008: enters compare mode with the disk version as the proposed content. */
  startCompare(id: string, disk: ReadResult): void;
  /** The disk changed again during a comparison: restart it with the latest disk version (remounts the editor). */
  restartCompare(id: string, disk: ReadResult): void;
  /** "Aceptar cambio": keeps the new pane; clean when it equals the disk version. Ctrl+Z restores the previous content. */
  acceptCompare(id: string, markdown: string): void;
  /** "Rechazar cambio": keeps the app's content; the next save asks before replacing the disk version. */
  rejectCompare(id: string): void;
  /** "Ignorar cambios": remembers the disk version so the same change is not asked again. */
  ignoreDiskVersion(id: string, hash: string): void;
  /** The disk now holds exactly this document's content (e.g. another program saved the same text). */
  syncWithDisk(id: string, r: ReadResult): void;
}

const dirty = (content: string, saved: string, canonical: string | null = null) =>
  content !== saved && content !== canonical;

export const useDocuments = create<DocumentsState>((set, get) => ({
  docs: {},
  order: [],
  activeId: null,
  untitledCounter: 0,

  newDocument() {
    const id = crypto.randomUUID();
    const n = get().untitledCounter + 1;
    const doc: EditorDocument = {
      id,
      filePath: null,
      fileName: `Sin título ${n}`,
      content: "",
      savedContent: "",
      isDirty: false,
      fingerprint: null,
      encoding: "utf-8",
      bom: false,
      eol: "crlf",
      externalState: "none",
      revision: 0,
      reloadSnapshot: null,
      canonical: null,
    };
    set((s) => ({
      docs: { ...s.docs, [id]: doc },
      order: [...s.order, id],
      activeId: id,
      untitledCounter: n,
    }));
    return id;
  },

  addOpened(r) {
    const existing = get().findByPath(r.path);
    if (existing) {
      set({ activeId: existing.id });
      return existing.id;
    }
    const id = crypto.randomUUID();
    const doc: EditorDocument = {
      id,
      filePath: r.path,
      fileName: fileNameOf(r.path),
      content: r.content,
      savedContent: r.content,
      isDirty: false,
      lastModified: r.fingerprint.mtimeMs,
      fingerprint: r.fingerprint,
      encoding: r.encoding,
      bom: r.bom,
      eol: r.eol,
      externalState: "none",
      revision: 0,
      reloadSnapshot: null,
      canonical: null,
    };
    set((s) => ({ docs: { ...s.docs, [id]: doc }, order: [...s.order, id], activeId: id }));
    return id;
  },

  findByPath(path) {
    const k = pathKey(path);
    return Object.values(get().docs).find((d) => d.filePath && pathKey(d.filePath) === k);
  },

  setContent(id, content) {
    set((s) => {
      const d = s.docs[id];
      if (!d || d.content === content) return s;
      const next = { ...d, content, isDirty: dirty(content, d.savedContent, d.canonical), reloadSnapshot: null };
      return { docs: { ...s.docs, [id]: next } };
    });
  },

  noteCanonical(id, markdown) {
    set((s) => {
      const d = s.docs[id];
      // only meaningful while the document is still unmodified
      if (!d || d.isDirty || d.canonical === markdown || markdown === d.savedContent) return s;
      return { docs: { ...s.docs, [id]: { ...d, canonical: markdown } } };
    });
  },

  markSaved(id, saved) {
    set((s) => {
      const d = s.docs[id];
      if (!d) return s;
      const filePath = saved.filePath ?? d.filePath;
      const next: EditorDocument = {
        ...d,
        filePath,
        fileName: filePath ? fileNameOf(filePath) : d.fileName,
        savedContent: saved.content,
        isDirty: dirty(d.content, saved.content, null),
        canonical: null,
        fingerprint: saved.fingerprint,
        lastModified: saved.fingerprint.mtimeMs,
        encoding: saved.encoding ?? d.encoding,
        bom: saved.bom ?? d.bom,
        externalState: "none",
      };
      return { docs: { ...s.docs, [id]: next } };
    });
  },

  addUntitled(name, content) {
    const id = get().newDocument();
    set((s) => ({
      docs: { ...s.docs, [id]: { ...s.docs[id], fileName: name, content, isDirty: content !== "" } },
    }));
    return id;
  },

  setExternalState(id, state) {
    set((s) => (s.docs[id] ? { docs: { ...s.docs, [id]: { ...s.docs[id], externalState: state } } } : s));
  },

  reloadFromDisk(id, r) {
    set((s) => {
      const d = s.docs[id];
      if (!d) return s;
      const next: EditorDocument = {
        ...d,
        content: r.content,
        savedContent: r.content,
        isDirty: false,
        fingerprint: r.fingerprint,
        lastModified: r.fingerprint.mtimeMs,
        encoding: r.encoding,
        bom: r.bom,
        eol: r.eol,
        externalState: "none",
        revision: d.revision + 1,
        reloadSnapshot: d.content,
        canonical: null,
      };
      return { docs: { ...s.docs, [id]: next } };
    });
  },

  startCompare(id, disk) {
    set((s) => (s.docs[id] ? { docs: { ...s.docs, [id]: { ...s.docs[id], compare: disk } }, activeId: id } : s));
  },

  restartCompare(id, disk) {
    set((s) => {
      const d = s.docs[id];
      return d ? { docs: { ...s.docs, [id]: { ...d, compare: disk, revision: d.revision + 1 } } } : s;
    });
  },

  acceptCompare(id, markdown) {
    set((s) => {
      const d = s.docs[id];
      const disk = d?.compare;
      if (!d || !disk) return s;
      const content = markdown.replace(/\r\n/g, "\n");
      const next: EditorDocument = {
        ...d,
        content,
        savedContent: disk.content,
        isDirty: dirty(content, disk.content, null),
        fingerprint: disk.fingerprint,
        lastModified: disk.fingerprint.mtimeMs,
        encoding: disk.encoding,
        bom: disk.bom,
        eol: disk.eol,
        externalState: "none",
        reloadSnapshot: d.content, // Ctrl+Z puts back what the app had (FR-007)
        canonical: null,
        compare: null,
        ignoredHash: null,
      };
      return { docs: { ...s.docs, [id]: next } };
    });
  },

  rejectCompare(id) {
    set((s) => {
      const d = s.docs[id];
      if (!d?.compare) return s;
      const next: EditorDocument = {
        ...d,
        externalState: "modified",
        ignoredHash: d.compare.fingerprint.hash,
        isDirty: true, // differs from the disk version from now on
        compare: null,
      };
      return { docs: { ...s.docs, [id]: next } };
    });
  },

  ignoreDiskVersion(id, hash) {
    set((s) => (s.docs[id] ? { docs: { ...s.docs, [id]: { ...s.docs[id], externalState: "modified", ignoredHash: hash } } } : s));
  },

  syncWithDisk(id, r) {
    set((s) => {
      const d = s.docs[id];
      if (!d) return s;
      const next: EditorDocument = {
        ...d,
        savedContent: r.content,
        isDirty: false,
        fingerprint: r.fingerprint,
        lastModified: r.fingerprint.mtimeMs,
        externalState: "none",
        canonical: null,
        ignoredHash: null,
      };
      return { docs: { ...s.docs, [id]: next } };
    });
  },

  restoreSnapshot(id) {
    const d = get().docs[id];
    if (!d || d.reloadSnapshot === null) return false;
    const content = d.reloadSnapshot;
    set((s) => ({
      docs: {
        ...s.docs,
        [id]: { ...d, content, isDirty: dirty(content, d.savedContent, d.canonical), revision: d.revision + 1, reloadSnapshot: null },
      },
    }));
    return true;
  },

  setActive(id) {
    if (get().docs[id]) set({ activeId: id });
  },

  move(id, toIndex) {
    set((s) => {
      const from = s.order.indexOf(id);
      if (from < 0) return s;
      const to = Math.max(0, Math.min(toIndex, s.order.length - 1));
      if (from === to) return s;
      const order = s.order.slice();
      order.splice(from, 1);
      order.splice(to, 0, id);
      return { order };
    });
  },

  close(id) {
    set((s) => {
      const { [id]: _removed, ...docs } = s.docs;
      void _removed;
      const order = s.order.filter((x) => x !== id);
      let activeId = s.activeId;
      if (activeId === id) {
        const idx = s.order.indexOf(id);
        activeId = order[Math.min(idx, order.length - 1)] ?? null;
      }
      return { docs, order, activeId };
    });
  },
}));
