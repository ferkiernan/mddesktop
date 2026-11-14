// Mounts the export panel only while a request is open; the panel (and the export pipeline) load on demand.
import { lazy, Suspense } from "react";
import { useExportPanel } from "./exportPanelStore";

const ExportPanel = lazy(() => import("./ExportPanel"));

export function ExportPanelHost() {
  const request = useExportPanel((s) => s.request);
  if (!request) return null;
  return (
    <Suspense fallback={null}>
      <ExportPanel request={request} />
    </Suspense>
  );
}
