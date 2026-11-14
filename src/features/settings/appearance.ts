import { chromeOf, findStyle } from "./applyStyle";
import { useSettings } from "./store";

const ZOOM_STEP = 0.1;
const round = (n: number) => Math.round(n * 100) / 100;

/** Selects an editor style preset; `theme` follows the preset (light/dark chrome). */
export const setEditorStyle = (id: string) => {
  const style = findStyle(id);
  return useSettings.getState().update({
    editorStyle: style.id,
    theme: chromeOf(style).dark ? "dark" : "light",
  });
};

/** View > toggle light/dark: switches between the Default and Oscuro presets. */
export const toggleTheme = () =>
  setEditorStyle(chromeOf(findStyle(useSettings.getState().prefs.editorStyle)).dark ? "default" : "dark");

export const zoomBy = (delta: number) =>
  useSettings.getState().update({ uiZoom: Math.min(2, Math.max(0.7, round(useSettings.getState().prefs.uiZoom + delta))) });

export const zoomIn = () => zoomBy(ZOOM_STEP);
export const zoomOut = () => zoomBy(-ZOOM_STEP);
export const zoomReset = () => useSettings.getState().update({ uiZoom: 1 });

/** Ver > Mostrar barra de herramientas (mdwysiwyg `showToolbar`). */
export const toggleEditorToolbar = () =>
  useSettings.getState().update({ editorToolbarVisible: !useSettings.getState().prefs.editorToolbarVisible });

/** Configuración > Historial de versiones (mdwysiwyg `historyUndo`). */
export const toggleEditorHistory = () =>
  useSettings.getState().update({ editorHistory: !useSettings.getState().prefs.editorHistory });

export const toggleStatusBar = () =>
  useSettings.getState().update({ statusBarVisible: !useSettings.getState().prefs.statusBarVisible });
