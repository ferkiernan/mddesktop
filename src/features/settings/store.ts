import { create } from "zustand";
import type { Preferences } from "../../services/contracts";
import { app, settings } from "../../services/ipc";
import { applyEditorStyle } from "./applyStyle";

export const DEFAULT_PREFS: Preferences = {
  version: 1,
  theme: "light",
  uiZoom: 1,
  statusBarVisible: true,
  lastDirectory: null,
  editorPoolSize: 3,
  largeFileWarnBytes: 256 * 1024,
  editorStyle: "default",
};

interface SettingsState {
  prefs: Preferences;
  loaded: boolean;
  load(): Promise<void>;
  update(patch: Partial<Preferences>): Promise<void>;
}

/** Applies theme and zoom to the document (CSS variables + `zoom`). */
export function applyAppearance(p: Preferences) {
  const style = applyEditorStyle(p.editorStyle);
  document.documentElement.style.setProperty("zoom", String(p.uiZoom));
  app.setStyleMenu(style.id).catch(() => undefined); // keep the native check mark in sync (no-op outside Tauri)
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
