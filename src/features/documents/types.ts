import type { Eol, FileFingerprint } from "../../services/contracts";

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
}

export function fileNameOf(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

export const pathKey = (p: string) => p.toLowerCase();
