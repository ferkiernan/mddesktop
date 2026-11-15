import { Component, useEffect, type ReactNode } from "react";
import "./theme.css";
import { SpikeEditors, spikeEnabled } from "./SpikeEditors";
import { EditorHost } from "../features/editor/EditorHost";
import { StatusBar } from "../ui/StatusBar";
import { ToastHost } from "../ui/Toast";
import { DialogHost } from "../ui/dialogs";
import { ExportPanelHost } from "../features/export/ExportPanelHost";
import { ThemesPanelHost } from "../features/themes/ThemesPanelHost";
import { AboutHost } from "../features/about/AboutDialog";
import { useStyleCatalog } from "../features/themes/catalog";
import { runMenuAction, startMenuBridge } from "./menuBridge";
import { startShortcuts } from "../features/shortcuts/manager";
import { events } from "../services/events";
import { TabBar } from "../features/tabs/TabBar";
import { newDocument } from "../features/documents/actions";
import { requestClose, requestExit } from "../features/documents/closeFlow";
import { startExternalChangeWatcher } from "../features/documents/externalChanges";
import { startOpenFilesHandler } from "../features/documents/openFilesHandler";
import { startReloadUndo } from "../features/editor/reloadUndo";
import { startWheelZoom } from "../features/settings/zoom";
import { useSettings } from "../features/settings/store";
import { useDocuments } from "../features/documents/store";
import { restoreSession } from "../features/session/restore";
import { startRecoveryWriter } from "../features/session/recoveryWriter";
import { startSessionManager } from "../features/session/sessionManager";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" style={{ padding: 16 }}>
          Error inesperado: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

/** Startup: preferences -> restore previous session -> start the long-lived services. */
function useAppLifecycle() {
  useEffect(() => {
    // E2E builds only (scripts/build-test-exe.mjs sets VITE_E2E): lets native tests drive the export
    // pipeline without the OS save dialog, which cannot be automated.
    if (import.meta.env.VITE_E2E) {
      (window as unknown as { __mdd?: unknown }).__mdd = {
        exportApi: () => import("../features/export/exportDocument"),
        rasterApi: () => import("../features/export/rasterize"),
        snapshotApi: () => import("../features/export/snapshot"),
        viewerApi: () => import("../features/export/viewer"),
        paginateApi: () => import("../features/export/paginate"),
        store: useDocuments,
      };
    }
    let cancelled = false;
    const stops: (() => void)[] = [startMenuBridge(), startReloadUndo(), startShortcuts(runMenuAction), startWheelZoom()];

    let unlistenClose: (() => void) | undefined;
    events
      .onCloseRequested(() => void requestExit())
      .then((u) => {
        if (cancelled) u();
        else unlistenClose = u;
      })
      .catch(() => undefined); // not inside Tauri
    stops.push(() => unlistenClose?.());

    void (async () => {
      await useStyleCatalog.getState().load(); // custom styles first: the saved active style may be one of them
      await useSettings.getState().load();
      await restoreSession();
      if (cancelled) return;
      stops.push(
        startSessionManager(),
        startRecoveryWriter(),
        startExternalChangeWatcher(),
        startOpenFilesHandler(), // after restore so launch files land after the old tabs
      );
    })();

    return () => {
      cancelled = true;
      stops.forEach((s) => s());
    };
  }, []);
}

export default function App() {
  useAppLifecycle();
  const statusBarVisible = useSettings((s) => s.prefs.statusBarVisible);
  return (
    <ErrorBoundary>
      <div className="app">
        <TabBar onNew={newDocument} onClose={(ids) => void requestClose(ids)} />
        <main className="app-main">{spikeEnabled ? <SpikeEditors /> : <EditorHost />}</main>
        {statusBarVisible && <StatusBar />}
        <ToastHost />
        <ExportPanelHost />
        <ThemesPanelHost />
        <AboutHost />
        <DialogHost />
      </div>
    </ErrorBoundary>
  );
}
