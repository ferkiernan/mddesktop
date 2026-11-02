import { useDocuments } from "../documents/store";
import { EditorAdapter } from "./EditorAdapter";

export function EditorHost() {
  const doc = useDocuments((s) => (s.activeId ? s.docs[s.activeId] : null));
  const setContent = useDocuments((s) => s.setContent);
  if (!doc) {
    return (
      <div className="empty-state">
        <p>Ningún documento abierto.</p>
        <p>Archivo → Nuevo (Ctrl+N) o Abrir (Ctrl+O)</p>
      </div>
    );
  }
  return (
    <EditorAdapter
      documentId={doc.id}
      initialContent={doc.content}
      revision={doc.revision}
      onChange={(md) => setContent(doc.id, md)}
    />
  );
}
