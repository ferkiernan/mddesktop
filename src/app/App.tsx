import { Component, type ReactNode } from "react";
import "./theme.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <div role="alert" style={{ padding: 16 }}>Error inesperado: {this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="app">
        <div className="app-tabs" role="tablist" aria-label="Documentos abiertos" />
        <main className="app-main" />
        <footer className="app-status">Listo</footer>
      </div>
    </ErrorBoundary>
  );
}
