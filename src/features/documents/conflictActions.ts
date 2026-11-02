import { documents } from "../../services/ipc";
import { toAppError } from "../../services/errors";
import { ask } from "../../ui/dialogs";
import { toast } from "../../ui/Toast";
import { forceSave } from "./actions";
import { useDocuments } from "./store";

async function fail(title: string, e: unknown) {
  await ask({
    title,
    message: toAppError(e).message,
    buttons: [{ label: "Aceptar", value: "ok", primary: true }],
  });
}

/** Option 3: reload the disk version into this tab (undoable with Ctrl+Z). */
export async function reloadHere(id: string): Promise<void> {
  const doc = useDocuments.getState().docs[id];
  if (!doc?.filePath) return;
  try {
    const r = await documents.read(doc.filePath, true);
    useDocuments.getState().reloadFromDisk(id, r);
    toast("Recargado desde disco — Ctrl+Z para deshacer");
  } catch (e) {
    await fail("No se pudo recargar", e);
  }
}

/** Option 2: open the disk version in a new untitled tab; the original tab stays untouched. */
export async function openDiskVersionInNewTab(id: string): Promise<void> {
  const doc = useDocuments.getState().docs[id];
  if (!doc?.filePath) return;
  try {
    const r = await documents.read(doc.filePath, true);
    useDocuments.getState().addUntitled(`${doc.fileName} (disco)`, r.content);
  } catch (e) {
    await fail("No se pudo abrir la versión del disco", e);
  }
}

/**
 * The file changed on disk while this document is open. With local edits the user
 * chooses between the three options of FR-014; without edits we offer a plain reload.
 * Returns true when the document ended up saved to disk (option 1).
 */
export async function resolveExternalChange(id: string, removed = false): Promise<boolean> {
  const doc = useDocuments.getState().docs[id];
  if (!doc) return false;
  const name = doc.fileName;

  if (removed) {
    useDocuments.getState().setExternalState(id, "removed");
    toast(`"${name}" fue eliminado o movido; Guardar lo recreará`);
    return false;
  }

  if (!doc.isDirty) {
    const choice = await ask({
      title: "Archivo modificado",
      message: `"${name}" cambió en disco. ¿Recargar el contenido?`,
      buttons: [
        { label: "Ignorar", value: "ignore" },
        { label: "Recargar", value: "reload", primary: true },
      ],
    });
    if (choice === "reload") await reloadHere(id);
    else useDocuments.getState().setExternalState(id, "modified");
    return false;
  }

  const choice = await ask({
    title: "Conflicto con el archivo en disco",
    message: `"${name}" cambió en disco y tiene cambios sin guardar aquí. ¿Qué hacemos?`,
    buttons: [
      { label: "Cancelar", value: "cancel" },
      { label: "Pisar archivo", value: "overwrite" },
      { label: "Abrir versión del disco en otra pestaña", value: "newtab" },
      { label: "Recargar aquí", value: "reload", primary: true },
    ],
  });
  if (choice === "overwrite") return forceSave(id);
  if (choice === "newtab") await openDiskVersionInNewTab(id);
  else if (choice === "reload") await reloadHere(id);
  if (choice === "cancel" || choice === "newtab") useDocuments.getState().setExternalState(id, "modified");
  return false;
}
