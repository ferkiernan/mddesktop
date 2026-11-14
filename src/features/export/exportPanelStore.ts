// Opens the export panel (spec 005) as a promise: resolves with the bytes shown in the preview, or null.
import { create } from "zustand";
import type { ExportFormat } from "../../services/contracts";
import type { BuiltExport } from "./exportDocument";

export interface ExportPanelRequest {
  format: ExportFormat;
  markdown: string;
  title: string;
  documentId?: string;
  resolve(result: BuiltExport | null): void;
}

export const useExportPanel = create<{ request: ExportPanelRequest | null }>(() => ({ request: null }));

export function openExportPanel(opts: Omit<ExportPanelRequest, "resolve">): Promise<BuiltExport | null> {
  return new Promise((resolve) => {
    useExportPanel.getState().request?.resolve(null); // never two panels at once
    useExportPanel.setState({ request: { ...opts, resolve } });
  });
}

export function closeExportPanel(result: BuiltExport | null) {
  const req = useExportPanel.getState().request;
  useExportPanel.setState({ request: null });
  req?.resolve(result);
}
