import { app } from "../../services/ipc";
import { ask } from "../../ui/dialogs";
import { save } from "./actions";
import { useDocuments } from "./store";

/**
 * Closes the given documents in order. A document with unsaved changes asks
 * Guardar / Descartar / Cancelar; Cancelar (or a failed save) aborts the whole operation.
 * Returns true when every requested document was closed.
 */
export async function requestClose(ids: string[]): Promise<boolean> {
  for (const id of ids) {
    const store = useDocuments.getState();
    const doc = store.docs[id];
    if (!doc) continue;
    if (doc.isDirty) {
      store.setActive(id);
      const choice = await ask({
        title: "Cambios sin guardar",
        message: `¿Guardar los cambios de "${doc.fileName}" antes de cerrar?`,
        buttons: [
          { label: "Cancelar", value: "cancel" },
          { label: "Descartar", value: "discard" },
          { label: "Guardar", value: "save", primary: true },
        ],
      });
      if (choice === "cancel") return false;
      if (choice === "save" && !(await save(id))) return false;
    }
    useDocuments.getState().close(id);
  }
  return true;
}

export const requestCloseAll = () => requestClose(useDocuments.getState().order.slice());

/** Resolves pending changes for every tab and, if none is cancelled, quits the app. */
export async function requestExit(): Promise<void> {
  if (await requestCloseAll()) await app.confirmExit();
}
