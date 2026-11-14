// Live editor handles per document (mdwysiwyg >= 0.3: insertMarkdown / setMarkdown are part of the handle).
import type { MarkdownEditorHandle } from "mdwysiwyg";

export type EditorCaps = Pick<MarkdownEditorHandle, "isModified" | "reset" | "insertMarkdown" | "setMarkdown">;

/** A registered editor; methods are absent only while the lazy editor has not mounted yet. */
export type EditorEntry = { [K in keyof EditorCaps]?: EditorCaps[K] };

const handles = new Map<string, EditorEntry>();

export function registerEditor(documentId: string, handle: EditorEntry | null) {
  if (handle) handles.set(documentId, handle);
  else handles.delete(documentId);
}

export const getEditor = (documentId: string): EditorEntry | undefined => handles.get(documentId);
