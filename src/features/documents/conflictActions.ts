import { documents } from "../../services/ipc";
import { toAppError } from "../../services/errors";
import { ask } from "../../ui/dialogs";
import { toast } from "../../ui/Toast";
import { getEditor } from "../editor/handles";
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
 * The file changed on disk while this document is open (spec 008, replaces 001 FR-014's options).
 * One dialog, with or without local changes: "Comparar" (primary), "Abrir de nuevo", "Ignorar cambios"
 * (also Escape). Nothing is written to disk by any option. Returns false (no save happened).
 */
export async function resolveExternalChange(id: string, removed = false): Promise<boolean> {
  const store = useDocuments.getState();
  const doc = store.docs[id];
  if (!doc) return false;
  const name = doc.fileName;

  if (removed) {
    store.setExternalState(id, "removed");
    toast(
      doc.compare
        ? `"${name}" fue eliminado o movido; "Aceptar cambio" sigue disponible y Guardar lo recreará`
        : `"${name}" fue eliminado o movido; Guardar lo recreará`,
    );
    return false;
  }
  if (!doc.filePath) return false;

  let disk;
  try {
    disk = await documents.read(doc.filePath, true);
  } catch (e) {
    await fail("No se pudo leer la versión del disco", e);
    return false;
  }
  const current = useDocuments.getState().docs[id];
  if (!current) return false;

  // the disk now holds exactly what the app has: nothing to decide
  if (disk.content === current.content) {
    useDocuments.getState().syncWithDisk(id, disk);
    return false;
  }

  // already comparing: offer to refresh the proposed (disk) side with the latest version
  if (current.compare) {
    if (disk.fingerprint.hash === current.compare.fingerprint.hash) return false;
    const touched = getEditor(id)?.isModified?.() ?? false;
    const choice = await ask({
      title: "El archivo volvió a cambiar",
      message: touched
        ? `"${name}" cambió otra vez en disco. Si actualizas la comparación se perderán los retoques hechos en la versión del disco.`
        : `"${name}" cambió otra vez en disco. ¿Actualizar la comparación con la última versión?`,
      buttons: [
        { label: "Mantener", value: "keep" },
        { label: "Actualizar comparación", value: "refresh", primary: true },
      ],
    });
    if (choice === "refresh") useDocuments.getState().restartCompare(id, disk);
    return false;
  }

  const choice = await ask({
    title: "Archivo modificado fuera de la aplicación",
    message: current.isDirty
      ? `"${name}" cambió en disco y tiene cambios sin guardar aquí. ¿Qué quieres hacer?`
      : `"${name}" cambió en disco. ¿Qué quieres hacer?`,
    buttons: [
      { label: "Ignorar cambios", value: "ignore" },
      { label: "Abrir de nuevo", value: "reload" },
      { label: "Comparar", value: "compare", primary: true },
    ],
  });
  if (choice === "compare") useDocuments.getState().startCompare(id, disk);
  else if (choice === "reload") {
    useDocuments.getState().reloadFromDisk(id, disk);
    toast("Abierto de nuevo desde disco — Ctrl+Z para deshacer");
  } else useDocuments.getState().ignoreDiskVersion(id, disk.fingerprint.hash);
  return false;
}

/**
 * Saving after the user ignored or rejected a disk version: confirm before replacing it (FR-004).
 * Returns true when the file was written.
 */
export async function confirmReplaceDiskVersion(id: string): Promise<boolean> {
  const doc = useDocuments.getState().docs[id];
  if (!doc) return false;
  const choice = await ask({
    title: "Reemplazar la versión del disco",
    message: `"${doc.fileName}" tiene en disco una versión distinta que decidiste no cargar. ¿Reemplazarla con la de la aplicación?`,
    buttons: [
      { label: "Cancelar", value: "cancel" },
      { label: "Reemplazar", value: "replace", primary: true },
    ],
  });
  return choice === "replace" ? forceSave(id) : false;
}
