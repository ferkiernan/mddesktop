import { documents, session } from "../../services/ipc";
import { fileNameOf } from "../documents/types";
import { useDocuments } from "../documents/store";
import { toast } from "../../ui/Toast";
import { flushRecovery } from "./recoveryWriter";

let restoring: Promise<void> | null = null;

/** Restores tabs and offers to recover unsaved work. Idempotent (StrictMode runs effects twice). */
export function restoreSession(): Promise<void> {
  restoring ??= doRestore().catch(() => undefined);
  return restoring;
}

export function _resetRestoreForTests() {
  restoring = null;
}

async function doRestore(): Promise<void> {
  const [prev, entries] = await Promise.all([session.load(), session.recoveryList()]);
  const byId = new Map(entries.map((e) => [e.documentId, e]));

  // Unsaved work is always restored (as "modified"); the user decides later whether to save it.
  const recover = entries.length > 0;

  const store = () => useDocuments.getState();
  const idMap = new Map<string, string>();
  const used = new Set<string>();
  const restored: string[] = [];

  for (const tab of prev?.tabs ?? []) {
    const entry = recover ? byId.get(tab.documentId) : undefined;
    if (entry) used.add(entry.documentId);
    let newId: string | null = null;
    if (tab.filePath) {
      try {
        const r = await documents.read(tab.filePath, true);
        newId = store().addOpened(r);
        if (entry) {
          store().setContent(newId, entry.content);
          if (entry.baseFingerprint && entry.baseFingerprint.hash !== r.fingerprint.hash) {
            store().setExternalState(newId, "modified"); // file changed while we were away
          }
        }
      } catch {
        if (entry) newId = store().addUntitled(fileNameOf(tab.filePath), entry.content);
      }
    } else if (entry) {
      newId = store().addUntitled("Recuperado", entry.content);
    }
    if (newId) {
      idMap.set(tab.documentId, newId);
      if (entry) restored.push(newId);
    }
  }
  if (recover) {
    for (const e of entries) {
      if (used.has(e.documentId)) continue;
      restored.push(store().addUntitled("Recuperado", e.content));
    }
  }

  // persist under the new ids first, then drop the old entries
  await Promise.all(restored.map((id) => flushRecovery(id)));
  await Promise.all(entries.map((e) => session.recoveryDelete(e.documentId).catch(() => undefined)));

  if (restored.length > 0) {
    toast(`Se restauraron ${restored.length} documento(s) con cambios sin guardar`, 4000);
  }

  const active = prev?.activeDocumentId ? idMap.get(prev.activeDocumentId) : undefined;
  if (active) store().setActive(active);
}
