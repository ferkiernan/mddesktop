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
  markSaved(id: string, saved: { content: string; fingerprint: FileFingerprint; filePath?: string; encoding?: string; bom?: boolean }): void;
  setActive(id: string): void;
  close(id: string): void;
}

const dirty = (content: string, saved: string) => content !== saved;

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
      return { docs: { ...s.docs, [id]: { ...d, content, isDirty: dirty(content, d.savedContent) } } };
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
        isDirty: dirty(d.content, saved.content),
        fingerprint: saved.fingerprint,
        lastModified: saved.fingerprint.mtimeMs,
        encoding: saved.encoding ?? d.encoding,
        bom: saved.bom ?? d.bom,
        externalState: "none",
      };
      return { docs: { ...s.docs, [id]: next } };
    });
  },

  setActive(id) {
    if (get().docs[id]) set({ activeId: id });
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
