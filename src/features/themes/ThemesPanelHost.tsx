// Mounts the Temas panel on demand (the panel and its preview editor load only when opened).
import { lazy, Suspense } from "react";
import { useThemesPanel } from "./themesPanelStore";

const ThemesPanel = lazy(() => import("./ThemesPanel"));

export function ThemesPanelHost() {
  const open = useThemesPanel((s) => s.open);
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <ThemesPanel />
    </Suspense>
  );
}
