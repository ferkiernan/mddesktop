// The only module that renders mdwysiwyg (contracts/editor-adapter.md).
import { memo, Suspense, useEffect, useMemo, useRef } from "react";
import { EDITOR_CLASS } from "../settings/applyStyle";
import { makeImageResolver } from "../images/resolveSrc";
import { registerEditor, type EditorCaps } from "./handles";
import { LazyMarkdownEditor } from "./lazy";

export interface EditorAdapterProps {
  documentId: string;
  initialContent: string; // read only on mount (the library is uncontrolled)
  revision: number; // bump to remount with new initialContent
  onChange(markdown: string): void;
}

function EditorAdapterImpl({ documentId, initialContent, revision, onChange }: EditorAdapterProps) {
  const handle = useRef<EditorCaps | null>(null);
  const resolveImageSrc = useMemo(() => makeImageResolver(documentId), [documentId]);

  useEffect(() => {
    // Getters, not copies: the lazy editor mounts after this effect runs, and the optional
    // capabilities (U1/U2) only exist if the installed mdwysiwyg provides them.
    const h = () => handle.current;
    registerEditor(documentId, {
      get isModified() {
        return h()?.isModified?.bind(h());
      },
      get reset() {
        return h()?.reset?.bind(h());
      },
      get insertMarkdown() {
        return h()?.insertMarkdown?.bind(h());
      },
      get setMarkdown() {
        return h()?.setMarkdown?.bind(h());
      },
    });
    return () => registerEditor(documentId, null);
  }, [documentId, revision]);

  // U3 (`resolveImageSrc`) and the U1/U2 handle methods do not exist in mdwysiwyg 0.2.x; the
  // library ignores unknown props, so they are passed through untyped until it ships them.
  const upstream = { resolveImageSrc } as object;

  return (
    <Suspense fallback={<div className="editor-loading">Cargando editor…</div>}>
      <LazyMarkdownEditor
        key={`${documentId}:${revision}`}
        ref={(h: unknown) => {
          handle.current = h as EditorCaps | null;
        }}
        documentId={documentId}
        initialContent={initialContent}
        onChange={(md) => onChange(md.replace(/\r\n/g, "\n"))}
        width="100%"
        height="100%"
        resizable={false}
        className={EDITOR_CLASS}
        {...upstream}
      />
    </Suspense>
  );
}

// The library is uncontrolled: re-rendering on every keystroke (initialContent changes) is pure waste.
export const EditorAdapter = memo(
  EditorAdapterImpl,
  (a, b) => a.documentId === b.documentId && a.revision === b.revision,
);
