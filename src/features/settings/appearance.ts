import { chromeOf, findStyle } from "./applyStyle";
import { useSettings } from "./store";


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

// spec 007: View zoom acts on the document content only (5 % steps); see zoom.ts
export { zoomIn, zoomOut, zoomReset } from "./zoom";

/** Ver > Mostrar barra de herramientas (mdwysiwyg `showToolbar`). */
export const toggleEditorToolbar = () =>
  useSettings.getState().update({ editorToolbarVisible: !useSettings.getState().prefs.editorToolbarVisible });

/** Configuración > Historial de versiones (mdwysiwyg `historyUndo`). */
export const toggleEditorHistory = () =>
  useSettings.getState().update({ editorHistory: !useSettings.getState().prefs.editorHistory });

export const toggleStatusBar = () =>
  useSettings.getState().update({ statusBarVisible: !useSettings.getState().prefs.statusBarVisible });
