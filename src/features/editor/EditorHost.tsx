import { useState } from "react";
import { useDocuments } from "../documents/store";
import { EditorAdapter } from "./EditorAdapter";
import { touchPool } from "./pool";

const POOL_SIZE = 3; // becomes a preference in the settings story (S1: ~20 MB per editor)

export function EditorHost() {
  const docs = useDocuments((s) => s.docs);
  const order = useDocuments((s) => s.order);
  const activeId = useDocuments((s) => s.activeId);
  const setContent = useDocuments((s) => s.setContent);
  const noteCanonical = useDocuments((s) => s.noteCanonical);
  const [stored, setStored] = useState<string[]>([]);

  // Derived state: remember the pool for the next activation (allowed during render).
  const pool = touchPool(stored, activeId, POOL_SIZE, order);
  if (pool.length !== stored.length || pool.some((id, i) => id !== stored[i])) setStored(pool);

  if (order.length === 0) {
    return (
      <div className="empty-state">
        <p>Ningún documento abierto.</p>
        <p>Archivo → Nuevo (Ctrl+N) o Abrir (Ctrl+O)</p>
      </div>
    );
  }
  return (
    <>
      {pool.map((id) => {
        const doc = docs[id];
        if (!doc) return null;
        return (
          <div key={id} className="editor-slot" hidden={id !== activeId}>
            <EditorAdapter
              documentId={id}
              initialContent={doc.content}
              revision={doc.revision}
              onChange={(md) => setContent(id, md)}
              onNormalized={(md) => noteCanonical(id, md)}
            />
          </div>
        );
      })}
    </>
  );
}
