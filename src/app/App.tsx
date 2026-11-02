import { Component, useEffect, type ReactNode } from "react";
import "./theme.css";
import { SpikeEditors, spikeEnabled } from "./SpikeEditors";
import { EditorHost } from "../features/editor/EditorHost";
import { StatusBar } from "../ui/StatusBar";
import { ToastHost } from "../ui/Toast";
import { DialogHost } from "../ui/dialogs";
import { startMenuBridge } from "./menuBridge";

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
  return (
    <ErrorBoundary>
      <div className="app">
        <div className="app-tabs" role="tablist" aria-label="Documentos abiertos" />
        <main className="app-main">{spikeEnabled ? <SpikeEditors /> : <EditorHost />}</main>
        <StatusBar />
        <ToastHost />
        <DialogHost />
      </div>
    </ErrorBoundary>
  );
}
