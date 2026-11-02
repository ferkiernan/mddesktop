import { useSettings } from "./store";

const ZOOM_STEP = 0.1;
const round = (n: number) => Math.round(n * 100) / 100;

export const toggleTheme = () =>
  useSettings.getState().update({ theme: useSettings.getState().prefs.theme === "dark" ? "light" : "dark" });

export const zoomBy = (delta: number) =>
  useSettings.getState().update({ uiZoom: Math.min(2, Math.max(0.7, round(useSettings.getState().prefs.uiZoom + delta))) });

export const zoomIn = () => zoomBy(ZOOM_STEP);
export const zoomOut = () => zoomBy(-ZOOM_STEP);
export const zoomReset = () => useSettings.getState().update({ uiZoom: 1 });

export const toggleStatusBar = () =>
  useSettings.getState().update({ statusBarVisible: !useSettings.getState().prefs.statusBarVisible });
