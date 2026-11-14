import { useDocuments } from "../features/documents/store";
import { useSettings } from "../features/settings/store";

export function StatusBar() {
  const doc = useDocuments((s) => (s.activeId ? s.docs[s.activeId] : null));
  const zoom = useSettings((s) => s.prefs.contentZoom);
  return (
    <footer className="app-status" role="status" aria-live="polite">
      {doc ? (
        <>
          <span title={doc.filePath ?? undefined}>{doc.filePath ?? doc.fileName}</span>
          <span> · {doc.isDirty ? "Modificado" : "Guardado"}</span>
          {zoom !== 1 && <span className="status-zoom" title="Zoom del contenido (Ctrl+0: tamaño normal)"> · Zoom {Math.round(zoom * 100)} %</span>}
        </>
      ) : (
        "Listo"
      )}
    </footer>
  );
}
