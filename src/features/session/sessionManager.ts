import type { Session } from "../../services/contracts";
import { session } from "../../services/ipc";
import { useDocuments } from "../documents/store";

export function buildSession(): Session {
  const { docs, order, activeId } = useDocuments.getState();
  const tabs = order
    .map((id) => docs[id])
    .filter((d) => d.filePath || d.isDirty)
    .map((d) => ({
      documentId: d.id,
      filePath: d.filePath,
      fingerprint: d.fingerprint,
      hasRecovery: d.isDirty,
    }));
  const active = activeId && tabs.some((t) => t.documentId === activeId) ? activeId : null;
  return { version: 1, savedAt: Date.now(), activeDocumentId: active, tabs };
}

/** Saves the session when tabs open/close/reorder/activate (not on every keystroke). */
export function startSessionManager(debounceMs = 500): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = "";
  const unsub = useDocuments.subscribe((state, prev) => {
    const structural =
      state.order !== prev.order ||
      state.activeId !== prev.activeId ||
      Object.values(state.docs).some((d) => d.filePath !== prev.docs[d.id]?.filePath || d.isDirty !== prev.docs[d.id]?.isDirty);
    if (!structural) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const s = buildSession();
      const sig = JSON.stringify({ ...s, savedAt: 0 });
      if (sig === last) return;
      last = sig;
      session.save(s).catch(() => undefined);
    }, debounceMs);
  });
  return () => {
    clearTimeout(timer);
    unsub();
  };
}
