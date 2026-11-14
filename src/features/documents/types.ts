import type { Eol, FileFingerprint, ReadResult } from "../../services/contracts";

export interface EditorDocument {
  id: string;
  filePath: string | null;
  fileName: string;
  content: string; // Markdown with "\n" (source of truth)
  savedContent: string;
  isDirty: boolean; // derived: content !== savedContent (recomputed by the store)
  lastModified?: number;
  fingerprint: FileFingerprint | null;
  encoding: string;
  bom: boolean;
  eol: Eol;
  externalState: "none" | "modified" | "removed";
  /** Bumped to force the editor to remount with the current content (e.g. after a reload). */
  revision: number;
  /** Content before a reload; lets Ctrl+Z restore it when the editor cannot (FR-014a fallback). */
  reloadSnapshot: string | null;
  /**
   * The editor re-serializes Markdown canonically (e.g. table separators), so its output for an
   * UNEDITED document can differ from the file text. We learn that canonical form from the first
   * non-edit emission and treat it as "not modified" (also after undoing back to it).
   */
  canonical: string | null;
  /**
   * Spec 008: the file changed on disk and the user chose "Comparar". The editor shows the app's content
   * (original, read-only) next to this disk version (new, editable) until the user accepts or rejects.
   */
  compare?: ReadResult | null;
  /** Hash of a disk version the user chose to ignore (no new dialog for that same version). */
  ignoredHash?: string | null;
}

export function fileNameOf(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

export const pathKey = (p: string) => p.toLowerCase();
