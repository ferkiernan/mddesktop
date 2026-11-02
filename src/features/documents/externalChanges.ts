import { documents } from "../../services/ipc";
import { events } from "../../services/events";
import type { z } from "zod";
import type { ExternalChangeEventSchema } from "../../services/contracts";
import { resolveExternalChange } from "./conflictActions";
import { useDocuments } from "./store";

type ExternalChange = z.infer<typeof ExternalChangeEventSchema>;

const resolving = new Set<string>();

export async function handleExternalChange(ev: ExternalChange): Promise<void> {
  const doc = useDocuments.getState().findByPath(ev.path);
  if (!doc || resolving.has(doc.id)) return;
  // already told the user about this exact disk state
  if (
    ev.kind === "modified" &&
    doc.externalState === "modified" &&
    ev.fingerprint &&
    doc.fingerprint?.hash === ev.fingerprint.hash
  ) {
    return;
  }
  resolving.add(doc.id);
  try {
    await resolveExternalChange(doc.id, ev.kind !== "modified");
  } finally {
    resolving.delete(doc.id);
  }
}

/** Keeps Rust's watcher in sync with the open files and reacts to its events. */
export function startExternalChangeWatcher(): () => void {
  let last = "";
  const sync = () => {
    const paths = Object.values(useDocuments.getState().docs)
      .map((d) => d.filePath)
      .filter((p): p is string => !!p)
      .sort();
    const sig = paths.join("|");
    if (sig === last) return;
    last = sig;
    documents.watch(paths).catch(() => undefined);
  };
  const unsub = useDocuments.subscribe(sync);
  sync();

  let unlisten: (() => void) | undefined;
  let stopped = false;
  events
    .onExternalChange((e) => void handleExternalChange(e))
    .then((u) => {
      if (stopped) u();
      else unlisten = u;
    })
    .catch(() => undefined);
  return () => {
    stopped = true;
    unsub();
    unlisten?.();
  };
}
