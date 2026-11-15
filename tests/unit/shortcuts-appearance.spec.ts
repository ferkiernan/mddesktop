import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { matchShortcut, startShortcuts, type KeyLike } from "../../src/features/shortcuts/manager";
import { useSettings, DEFAULT_PREFS } from "../../src/features/settings/store";
import {
  toggleEditorHistory,
  toggleSpellcheck,
  toggleEditorToolbar,
  toggleStatusBar,
  toggleTheme,
  zoomIn,
  zoomOut,
  zoomReset,
} from "../../src/features/settings/appearance";
import { runMenuAction } from "../../src/app/menuBridge";
import { installMockIpc } from "../helpers/mockIpc";

const key = (k: string, o: Partial<KeyLike> = {}): KeyLike => ({
  key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...o,
});

describe("shortcut mapping (FR-018)", () => {
  it.each([
    ["n", {}, "file.new"],
    ["o", {}, "file.open"],
    ["s", {}, "file.save"],
    ["S", { shiftKey: true }, "file.saveAs"],
    ["w", {}, "file.close"],
    ["Tab", {}, "tab.next"],
    ["Tab", { shiftKey: true }, "tab.prev"],
  ])("Ctrl+%s %j -> %s", (k, mods, action) => {
    expect(matchShortcut(key(k, { ctrlKey: true, ...mods }), false)).toBe(action);
  });

  it("uses Cmd on macOS and ignores Ctrl there", () => {
    expect(matchShortcut(key("s", { metaKey: true }), true)).toBe("file.save");
    expect(matchShortcut(key("s", { ctrlKey: true }), true)).toBeNull();
    expect(matchShortcut(key("s", { metaKey: true }), false)).toBeNull();
  });

  it("never claims the editor's own shortcuts", () => {
    for (const k of ["z", "y", "x", "c", "v", "a", "b", "i"]) {
      expect(matchShortcut(key(k, { ctrlKey: true }), false)).toBeNull();
      expect(matchShortcut(key(k, { ctrlKey: true, shiftKey: true }), false)).toBeNull();
    }
    expect(matchShortcut(key("s", { ctrlKey: true, altKey: true }), false)).toBeNull();
    expect(matchShortcut(key("s"), false)).toBeNull();
  });

  it("dispatches from a real keydown and prevents the default action", () => {
    const run = vi.fn();
    const stop = startShortcuts(run);
    const ev = new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true });
    window.dispatchEvent(ev);
    expect(run).toHaveBeenCalledWith("file.save");
    expect(ev.defaultPrevented).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
    expect(run).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe("appearance (theme, zoom, status bar)", () => {
  let ipc: ReturnType<typeof installMockIpc>;
  beforeEach(() => {
    useSettings.setState({ prefs: DEFAULT_PREFS });
    // echo the patch back like the Rust command does
    ipc = installMockIpc({
      settings_save: (a) => ({ ...useSettings.getState().prefs, ...(a?.patch as object) }),
      set_style_menu: () => null,
      set_view_menu: () => null,
    });
  });
  afterEach(() => ipc.restore());

  it("toggles the theme, applies it to the document and persists it", async () => {
    await toggleTheme();
    expect(useSettings.getState().prefs.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(ipc.calls.find((c) => c.cmd === "settings_save")).toMatchObject({ args: { patch: { theme: "dark", editorStyle: "dark" } } });
    await toggleTheme();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("View zoom changes the content zoom in 5 % steps within 50-300 % (spec 007)", async () => {
    await zoomIn();
    expect(useSettings.getState().prefs.contentZoom).toBe(1.05);
    for (let i = 0; i < 60; i++) await zoomIn();
    expect(useSettings.getState().prefs.contentZoom).toBe(3);
    for (let i = 0; i < 80; i++) await zoomOut();
    expect(useSettings.getState().prefs.contentZoom).toBe(0.5);
    await zoomReset();
    expect(useSettings.getState().prefs.contentZoom).toBe(1);
    expect(document.documentElement.style.getPropertyValue("zoom")).toBe(""); // no whole-window zoom any more
  });

  it("toggles the status bar", async () => {
    await toggleStatusBar();
    expect(useSettings.getState().prefs.statusBarVisible).toBe(false);
  });

  it("editor toolbar and version history are on by default, toggle, persist and sync the menu checks", async () => {
    expect(DEFAULT_PREFS.editorToolbarVisible && DEFAULT_PREFS.editorHistory).toBe(true);
    await toggleEditorToolbar();
    await toggleEditorHistory();
    const p = useSettings.getState().prefs;
    expect([p.editorToolbarVisible, p.editorHistory]).toEqual([false, false]);
    const saves = ipc.calls.filter((c) => c.cmd === "settings_save").map((c) => c.args?.patch);
    expect(saves).toEqual(expect.arrayContaining([{ editorToolbarVisible: false }, { editorHistory: false }]));
    expect(ipc.calls.filter((c) => c.cmd === "set_view_menu").at(-1)?.args).toEqual({ toolbar: false, history: false, spellcheckDisabled: false });
  });

  it("spell checking is on by default; Configuración > Desactivar corrector ortográfico toggles, persists and syncs its check (spec 015)", async () => {
    expect(DEFAULT_PREFS.spellcheckDisabled).toBe(false);
    runMenuAction("settings.toggleSpellcheck");
    await vi.waitFor(() => expect(useSettings.getState().prefs.spellcheckDisabled).toBe(true));
    expect(ipc.calls.filter((c) => c.cmd === "settings_save").map((c) => c.args?.patch)).toContainEqual({ spellcheckDisabled: true });
    expect(ipc.calls.filter((c) => c.cmd === "set_view_menu").at(-1)?.args).toMatchObject({ spellcheckDisabled: true });
    await toggleSpellcheck();
    expect(useSettings.getState().prefs.spellcheckDisabled).toBe(false);
  });

  it("the native menu actions reach the toggles", async () => {
    runMenuAction("view.toggleToolbar");
    runMenuAction("settings.toggleHistory");
    await vi.waitFor(() => expect(useSettings.getState().prefs.editorHistory).toBe(false));
    expect(useSettings.getState().prefs.editorToolbarVisible).toBe(false);
  });
});
