import { events } from "../services/events";
import { newDocument, openFiles, save, saveAs } from "../features/documents/actions";
import { requestClose, requestCloseAll, requestExit } from "../features/documents/closeFlow";
import { useDocuments } from "../features/documents/store";
import { activateNext } from "../features/tabs/tabs";
import { insertImage } from "../features/images/insertImage";
import { runEdit } from "../features/editor/editCommands";
import {
  setEditorStyle,
  toggleEditorHistory,
  toggleEditorToolbar,
  toggleStatusBar,
  toggleTheme,
  zoomIn,
  zoomOut,
  zoomReset,
} from "../features/settings/appearance";
import type { ExportFormat, MenuActionId } from "../services/contracts";

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
    case "file.close":
      if (active) void requestClose([active]);
      return;
    case "file.closeAll":
      void requestCloseAll();
      return;
    case "file.exit":
      void requestExit();
      return;
    case "tab.next":
      activateNext(1);
      return;
    case "tab.prev":
      activateNext(-1);
      return;
    case "export.html":
    case "export.pdf":
    case "export.docx":
    case "export.odt":
      // loaded on demand: the export module is only needed when the user exports
      void import("../features/export/exportDocument").then((m) => m.exportActiveDocument(id.slice(7) as ExportFormat));
      return;
    case "insert.image":
      void insertImage();
      return;
    case "edit.undo":
    case "edit.redo":
    case "edit.cut":
    case "edit.copy":
    case "edit.paste":
    case "edit.selectAll":
      void runEdit(id.slice(5) as Parameters<typeof runEdit>[0]);
      return;
    case "view.toggleTheme":
      void toggleTheme();
      return;
    case "view.zoomIn":
      void zoomIn();
      return;
    case "view.zoomOut":
      void zoomOut();
      return;
    case "view.zoomReset":
      void zoomReset();
      return;
    case "view.toggleStatusBar":
      void toggleStatusBar();
      return;
    case "view.toggleToolbar":
      void toggleEditorToolbar();
      return;
    case "settings.toggleHistory":
      void toggleEditorHistory();
      return;
    default:
      if (id.startsWith("style.")) void setEditorStyle(id.slice(6));
      return;
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
