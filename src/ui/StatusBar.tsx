import { useDocuments } from "../features/documents/store";

export function StatusBar() {
  const doc = useDocuments((s) => (s.activeId ? s.docs[s.activeId] : null));
  return (
    <footer className="app-status">
      {doc ? (
        <>
          <span title={doc.filePath ?? undefined}>{doc.filePath ?? doc.fileName}</span>
          <span> · {doc.isDirty ? "Modificado" : "Guardado"}</span>
        </>
      ) : (
        "Listo"
      )}
    </footer>
  );
}
