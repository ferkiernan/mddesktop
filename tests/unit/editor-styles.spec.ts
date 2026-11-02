import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EDITOR_STYLES } from "../../src/features/settings/editorStyles";
import { applyEditorStyle, chromeOf, findStyle, luminance, styleCss } from "../../src/features/settings/applyStyle";
import { setEditorStyle, toggleTheme } from "../../src/features/settings/appearance";
import { DEFAULT_PREFS, useSettings } from "../../src/features/settings/store";
import { installMockIpc } from "../helpers/mockIpc";

const REQUIRED = [
  "--mdw-toolbar-gradient-from", "--mdw-toolbar-gradient-via", "--mdw-toolbar-gradient-to", "--mdw-toolbar-fg",
  "--mdw-toolbar-font-family", "--mdw-toolbar-select-bg", "--mdw-button-active-bg",
  "--mdw-button-hover-gradient-from", "--mdw-button-hover-gradient-to", "--mdw-content-bg",
  "--mdw-content-wysiwyg-fg", "--mdw-content-wysiwyg-font-family", "--mdw-content-markdown-fg",
  "--mdw-content-markdown-font-family", "--mdw-scrollbar-thumb", "--mdw-scrollbar-track",
  "--mdw-table-header-bg", "--mdw-code-block-bg", "--mdw-mermaid-bg",
];

describe("editor style presets (from the mdwysiwyg demo)", () => {
  it("has the 7 demo presets, each defining every mdwysiwyg variable", () => {
    expect(EDITOR_STYLES.map((s) => s.id)).toEqual(["default", "dark", "notebook", "terminal", "winamp", "cg", "anthropic"]);
    for (const s of EDITOR_STYLES) expect(Object.keys(s.vars).sort(), s.id).toEqual([...REQUIRED].sort());
  });

  it("stays in sync with the native Configuración menu in menu.rs", () => {
    const rs = readFileSync("src-tauri/src/services/menu.rs", "utf8");
    const list = [...rs.matchAll(/\("([a-z0-9-]+)", "([^"]+)"\),/g)].map((m) => [m[1], m[2]]);
    expect(list).toEqual(EDITOR_STYLES.map((s) => [s.id, s.label]));
  });

  it("emits scoped CSS per preset and falls back to default for unknown ids", () => {
    const css = styleCss(findStyle("winamp"));
    expect(css.startsWith('html[data-editor-style="winamp"] .mdd-editor {')).toBe(true);
    expect(css).toContain("--mdw-toolbar-fg:");
    expect(findStyle("nope").id).toBe("default");
  });

  it("classifies light and dark chrome from the preset colours", () => {
    expect(luminance("#ffffff")).toBeCloseTo(1);
    expect(luminance("linear-gradient(#fff, #000)")).toBeNull();
    expect(chromeOf(findStyle("default")).dark).toBe(false);
    expect(chromeOf(findStyle("dark")).dark).toBe(true);
    // gradient content background (notebook) falls back to a solid colour for the chrome
    expect(chromeOf(findStyle("notebook")).bg).toMatch(/^#/);
  });
});

describe("applying a style", () => {
  let ipc: ReturnType<typeof installMockIpc>;
  beforeEach(() => {
    useSettings.setState({ prefs: DEFAULT_PREFS });
    ipc = installMockIpc({
      settings_save: (a) => ({ ...useSettings.getState().prefs, ...(a?.patch as object) }),
      set_style_menu: () => null,
    });
  });
  afterEach(() => ipc.restore());

  it("sets data attributes, chrome variables and a single style element", () => {
    applyEditorStyle("terminal");
    const root = document.documentElement;
    expect(root.dataset.editorStyle).toBe("terminal");
    expect(root.style.getPropertyValue("--accent")).not.toBe("");
    applyEditorStyle("anthropic");
    expect(document.querySelectorAll("#mdd-editor-styles")).toHaveLength(1);
    expect(document.getElementById("mdd-editor-styles")!.textContent).toContain('data-editor-style="cg"');
  });

  it("selecting a style persists it with the matching light/dark theme and syncs the menu check", async () => {
    await setEditorStyle("winamp");
    expect(useSettings.getState().prefs.editorStyle).toBe("winamp");
    expect(ipc.calls.find((c) => c.cmd === "settings_save")?.args).toMatchObject({
      patch: { editorStyle: "winamp", theme: chromeOf(findStyle("winamp")).dark ? "dark" : "light" },
    });
    expect(ipc.calls.some((c) => c.cmd === "set_style_menu" && (c.args as { style: string }).style === "winamp")).toBe(true);
  });

  it("the View > light/dark toggle switches between Default and Oscuro", async () => {
    await toggleTheme();
    expect(useSettings.getState().prefs.editorStyle).toBe("dark");
    await toggleTheme();
    expect(useSettings.getState().prefs.editorStyle).toBe("default");
  });
});
