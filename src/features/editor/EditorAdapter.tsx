// The only module that renders mdwysiwyg (contracts/editor-adapter.md).
import { memo, Suspense } from "react";
import { LazyMarkdownEditor } from "./lazy";

export interface EditorAdapterProps {
  documentId: string;
  initialContent: string; // read only on mount (the library is uncontrolled)
  revision: number; // bump to remount with new initialContent
  onChange(markdown: string): void;
}

function EditorAdapterImpl({ documentId, initialContent, revision, onChange }: EditorAdapterProps) {
  return (
    <Suspense fallback={<div className="editor-loading">Cargando editor…</div>}>
      <LazyMarkdownEditor
        key={`${documentId}:${revision}`}
        documentId={documentId}
        initialContent={initialContent}
        onChange={(md) => onChange(md.replace(/\r\n/g, "\n"))}
        width="100%"
        height="100%"
        resizable={false}
      />
    </Suspense>
  );
}

// The library is uncontrolled: re-rendering on every keystroke (initialContent changes) is pure waste.
export const EditorAdapter = memo(
  EditorAdapterImpl,
  (a, b) => a.documentId === b.documentId && a.revision === b.revision,
);
