import { Component, useEffect, type ReactNode } from "react";
import "./theme.css";
import { SpikeEditors, spikeEnabled } from "./SpikeEditors";
import { EditorHost } from "../features/editor/EditorHost";
import { StatusBar } from "../ui/StatusBar";
import { ToastHost } from "../ui/Toast";
import { DialogHost } from "../ui/dialogs";
import { startMenuBridge } from "./menuBridge";
import { events } from "../services/events";
import { startExternalChangeWatcher } from "../features/documents/externalChanges";
import { startReloadUndo } from "../features/editor/reloadUndo";
import { TabBar } from "../features/tabs/TabBar";
import { newDocument } from "../features/documents/actions";
import { requestClose, requestExit } from "../features/documents/closeFlow";

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

export default function App() {
  useEffect(() => startMenuBridge(), []);
  useEffect(() => startExternalChangeWatcher(), []);
  useEffect(() => startReloadUndo(), []);
  useEffect(() => {
    let un: (() => void) | undefined;
    let stopped = false;
    events
      .onCloseRequested(() => void requestExit())
      .then((u) => (stopped ? u() : (un = u)))
      .catch(() => undefined);
    return () => {
      stopped = true;
      un?.();
    };
  }, []);
  return (
    <ErrorBoundary>
      <div className="app">
        <TabBar onNew={newDocument} onClose={(ids) => void requestClose(ids)} />
        <main className="app-main">{spikeEnabled ? <SpikeEditors /> : <EditorHost />}</main>
        <StatusBar />
        <ToastHost />
        <DialogHost />
      </div>
    </ErrorBoundary>
  );
}
