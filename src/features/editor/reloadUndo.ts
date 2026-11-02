// FR-014a fallback: mdwysiwyg exposes no setMarkdown (upstream U1), so after a reload the app
// remounts the editor and restores the previous content on the first Ctrl+Z, until the user edits.
import { useDocuments } from "../documents/store";
import { toast } from "../../ui/Toast";

export function startReloadUndo(): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "z") return;
    const { activeId, docs, restoreSnapshot } = useDocuments.getState();
    if (!activeId || docs[activeId]?.reloadSnapshot == null) return;
    if (restoreSnapshot(activeId)) {
      e.preventDefault();
      e.stopPropagation();
      toast("Recarga deshecha");
    }
  };
  window.addEventListener("keydown", onKey, true); // capture: runs before the editor
  return () => window.removeEventListener("keydown", onKey, true);
}
