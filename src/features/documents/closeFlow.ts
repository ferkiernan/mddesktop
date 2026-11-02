import { app, session } from "../../services/ipc";
import { flushRecovery } from "../session/recoveryWriter";
import { buildSession } from "../session/sessionManager";
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

/**
 * Quits the app. Unsaved changes are NOT lost and the user is NOT asked: every modified
 * document is written to the recovery store (temp) and the session is saved; on the next
 * launch everything comes back as "modified" and the user decides whether to save.
 * Only if a recovery write fails do we fall back to asking Guardar / Descartar / Cancelar.
 */
export async function requestExit(): Promise<void> {
  const { docs, order } = useDocuments.getState();
  const dirty = order.filter((id) => docs[id]?.isDirty);
  const results = await Promise.all(dirty.map((id) => flushRecovery(id)));
  if (results.every(Boolean)) {
    try {
      await session.save(buildSession());
    } catch {
      /* the session file is only a convenience; recovery entries already hold the work */
    }
    await app.confirmExit();
    return;
  }
  if (await requestCloseAll()) await app.confirmExit(); // could not keep the changes: ask
}
