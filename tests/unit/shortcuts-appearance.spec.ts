import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { matchShortcut, startShortcuts, type KeyLike } from "../../src/features/shortcuts/manager";
import { useSettings, DEFAULT_PREFS } from "../../src/features/settings/store";
import { toggleStatusBar, toggleTheme, zoomIn, zoomOut, zoomReset } from "../../src/features/settings/appearance";
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
    ipc = installMockIpc({ settings_save: (a) => ({ ...useSettings.getState().prefs, ...(a?.patch as object) }) });
  });
  afterEach(() => ipc.restore());

  it("toggles the theme, applies it to the document and persists it", async () => {
    await toggleTheme();
    expect(useSettings.getState().prefs.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(ipc.calls.at(-1)).toMatchObject({ cmd: "settings_save", args: { patch: { theme: "dark" } } });
    await toggleTheme();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("zooms within 0.7-2.0 and resets", async () => {
    await zoomIn();
    expect(useSettings.getState().prefs.uiZoom).toBe(1.1);
    for (let i = 0; i < 30; i++) await zoomIn();
    expect(useSettings.getState().prefs.uiZoom).toBe(2);
    for (let i = 0; i < 30; i++) await zoomOut();
    expect(useSettings.getState().prefs.uiZoom).toBe(0.7);
    await zoomReset();
    expect(useSettings.getState().prefs.uiZoom).toBe(1);
  });

  it("toggles the status bar", async () => {
    await toggleStatusBar();
    expect(useSettings.getState().prefs.statusBarVisible).toBe(false);
  });
});
