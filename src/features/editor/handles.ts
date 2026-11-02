// Live editor handles per document, with the optional capabilities added upstream (U1/U2).
export interface EditorCaps {
  isModified?(): boolean;
  reset?(): void;
  /** U2: insert Markdown at the cursor. */
  insertMarkdown?(md: string): void;
  /** U1: replace content as an undoable change. */
  setMarkdown?(md: string): void;
}

const handles = new Map<string, EditorCaps>();

export function registerEditor(documentId: string, handle: EditorCaps | null) {
  if (handle) handles.set(documentId, handle);
  else handles.delete(documentId);
}

export const getEditor = (documentId: string): EditorCaps | undefined => handles.get(documentId);
