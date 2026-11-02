// The only module that renders mdwysiwyg (contracts/editor-adapter.md).
import { memo, Suspense, useEffect, useMemo, useRef } from "react";
import { EDITOR_CLASS } from "../settings/applyStyle";
import { makeImageResolver } from "../images/resolveSrc";
import { registerEditor, type EditorCaps } from "./handles";
import { LazyMarkdownEditor } from "./lazy";
import { createEditTracker, isEditClick, isEditKey } from "./userEdit";

export interface EditorAdapterProps {
  documentId: string;
  initialContent: string; // read only on mount (the library is uncontrolled)
  revision: number; // bump to remount with new initialContent
  /** A user edit changed the Markdown. */
  onChange(markdown: string): void;
  /** The editor re-serialized the document without a user edit (canonical form of the unedited text). */
  onNormalized?(markdown: string): void;
}

const INPUT_EVENTS = ["beforeinput", "input", "compositionend", "paste", "cut", "drop"];

function EditorAdapterImpl({ documentId, initialContent, revision, onChange, onNormalized }: EditorAdapterProps) {
  const handle = useRef<EditorCaps | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const tracker = useMemo(() => createEditTracker(), []);
  const resolveImageSrc = useMemo(() => makeImageResolver(documentId), [documentId]);

  // Interactions that can change content open a short window in which onChange counts as an edit.
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (isEditKey(e)) tracker.mark();
    };
    const mark = () => tracker.mark();
    el.addEventListener("keydown", onKey, true);
    for (const t of INPUT_EVENTS) el.addEventListener(t, mark, true);
    return () => {
      el.removeEventListener("keydown", onKey, true);
      for (const t of INPUT_EVENTS) el.removeEventListener(t, mark, true);
    };
  }, [tracker]);

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
        const fn = h()?.insertMarkdown?.bind(h());
        return fn && ((md: string) => (tracker.mark(), fn(md))); // host-driven change: an edit
      },
      get setMarkdown() {
        const fn = h()?.setMarkdown?.bind(h());
        return fn && ((md: string) => (tracker.mark(), fn(md)));
      },
    });
    return () => registerEditor(documentId, null);
  }, [documentId, revision, tracker]);

  // U3 (`resolveImageSrc`) and the U1/U2 handle methods do not exist in mdwysiwyg 0.2.x; the
  // library ignores unknown props, so they are passed through untyped until it ships them.
  const upstream = { resolveImageSrc } as object;

  return (
    <div
      ref={wrapper}
      className="editor-interaction"
      onClickCapture={(e) => {
        // toolbar buttons, popovers, checkboxes... (React capture also sees portaled popovers)
        if (isEditClick(e.target as Element)) tracker.mark();
      }}
    >
      <Suspense fallback={<div className="editor-loading">Cargando editor…</div>}>
        <LazyMarkdownEditor
          key={`${documentId}:${revision}`}
          ref={(h: unknown) => {
            handle.current = h as EditorCaps | null;
          }}
          documentId={documentId}
          initialContent={initialContent}
          onChange={(md) => {
            const text = md.replace(/\r\n/g, "\n");
            if (tracker.isEdit()) onChange(text);
            else onNormalized?.(text);
          }}
          width="100%"
          height="100%"
          resizable={false}
          className={EDITOR_CLASS}
          {...upstream}
        />
      </Suspense>
    </div>
  );
}

// The library is uncontrolled: re-rendering on every keystroke (initialContent changes) is pure waste.
export const EditorAdapter = memo(
  EditorAdapterImpl,
  (a, b) => a.documentId === b.documentId && a.revision === b.revision,
);
