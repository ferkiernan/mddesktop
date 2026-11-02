import { events } from "../services/events";
import { newDocument, openFiles, save, saveAs } from "../features/documents/actions";
import { useDocuments } from "../features/documents/store";
import type { MenuActionId } from "../services/contracts";

export function runMenuAction(id: MenuActionId) {
  const active = useDocuments.getState().activeId;
  switch (id) {
    case "file.new":
      newDocument();
      return;
    case "file.open":
      void openFiles();
      return;
    case "file.save":
      if (active) void save(active);
      return;
    case "file.saveAs":
      if (active) void saveAs(active);
      return;
    default:
      return; // other actions arrive with their stories
  }
}

/** Subscribes to native menu events; returns an unsubscribe function. */
export function startMenuBridge(): () => void {
  let unlisten: (() => void) | undefined;
  let stopped = false;
  events
    .onMenuAction(({ id }) => runMenuAction(id))
    .then((u) => {
      if (stopped) u();
      else unlisten = u;
    })
    .catch(() => undefined); // not running inside Tauri (e.g. plain browser tests)
  return () => {
    stopped = true;
    unlisten?.();
  };
}
