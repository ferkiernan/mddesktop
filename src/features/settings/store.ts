import { create } from "zustand";
import type { Preferences } from "../../services/contracts";
import { app, settings } from "../../services/ipc";
import { applyEditorStyle } from "./applyStyle";
import { applyZoom } from "./zoom";

export const DEFAULT_PREFS: Preferences = {
  version: 1,
  theme: "light",
  uiZoom: 1,
  statusBarVisible: true,
  lastDirectory: null,
  editorPoolSize: 3,
  largeFileWarnBytes: 256 * 1024,
  editorStyle: "default",
  editorToolbarVisible: true,
  editorHistory: true,
  exportStyle: "screen",
  contentZoom: 1,
  barScale: 1,
};

interface SettingsState {
  prefs: Preferences;
  loaded: boolean;
  load(): Promise<void>;
  update(patch: Partial<Preferences>): Promise<void>;
}

/** Applies the style, the content zoom and the bar size (spec 007: no whole-window zoom any more). */
export function applyAppearance(p: Preferences) {
  const style = applyEditorStyle(p.editorStyle);
  applyZoom(p.contentZoom, p.barScale);
  app.setStyleMenu(style.id).catch(() => undefined); // keep the native check mark in sync (no-op outside Tauri)
  app.setViewMenu(p.editorToolbarVisible, p.editorHistory).catch(() => undefined);
}

export const useSettings = create<SettingsState>((set, get) => ({
  prefs: DEFAULT_PREFS,
  loaded: false,
  async load() {
    try {
      const prefs = await settings.load();
      set({ prefs, loaded: true });
    } catch {
      set({ loaded: true }); // defaults keep the app usable
    }
    applyAppearance(get().prefs);
  },
  async update(patch) {
    set((s) => ({ prefs: { ...s.prefs, ...patch } })); // optimistic
    applyAppearance(get().prefs);
    try {
      set({ prefs: await settings.save(patch) });
      applyAppearance(get().prefs);
    } catch {
      /* keep the optimistic value for this run */
    }
  },
}));
