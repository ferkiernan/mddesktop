import { session } from "../../services/ipc";
import { useDocuments } from "../documents/store";

export const RECOVERY_DELAY_MS = 4000; // FR-020a: ~3-5 s after the last change

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const written = new Set<string>(); // ids that currently have a recovery entry
const lastContent = new Map<string, string>();

function clearTimer(id: string) {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
}

/** Writes the document's unsaved content to the recovery store. Resolves false only if the write failed. */
export async function flushRecovery(id: string): Promise<boolean> {
  clearTimer(id);
  const d = useDocuments.getState().docs[id];
  if (!d || !d.isDirty) return true;
  try {
    await session.recoveryWrite({
      documentId: id,
      filePath: d.filePath,
      baseFingerprint: d.fingerprint,
      eol: d.eol,
      encoding: d.encoding,
      bom: d.bom,
      writtenAt: Date.now(),
      content: d.content,
    });
    written.add(id);
    return true;
  } catch {
    return false; // best effort while editing; the caller decides what a failure means
  }
}

async function drop(id: string) {
  clearTimer(id);
  lastContent.delete(id);
  if (written.delete(id)) await session.recoveryDelete(id).catch(() => undefined);
}

/** Debounced recovery writes; no timers run while nothing changes. */
export function startRecoveryWriter(delayMs = RECOVERY_DELAY_MS): () => void {
  return useDocuments.subscribe((state, prev) => {
    for (const id of Object.keys(prev.docs)) {
      if (!state.docs[id]) void drop(id);
    }
    for (const [id, d] of Object.entries(state.docs)) {
      if (lastContent.get(id) === d.content && prev.docs[id]?.isDirty === d.isDirty) continue;
      lastContent.set(id, d.content);
      if (d.isDirty) {
        clearTimer(id);
        timers.set(id, setTimeout(() => void flushRecovery(id), delayMs));
      } else {
        void drop(id);
      }
    }
    // leaving a tab flushes its pending write right away
    if (prev.activeId && prev.activeId !== state.activeId && timers.has(prev.activeId)) {
      void flushRecovery(prev.activeId);
    }
  });
}

export function _resetRecoveryForTests() {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  written.clear();
  lastContent.clear();
}
