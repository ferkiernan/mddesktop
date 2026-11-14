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
  // base colours (menus, dialogs and popovers use them) + the 20 variables added in mdwysiwyg 0.5.0
  "--mdw-bg", "--mdw-fg", "--mdw-muted", "--mdw-border", "--mdw-accent",
  "--mdw-code-keyword", "--mdw-code-string", "--mdw-code-comment", "--mdw-code-number", "--mdw-code-title",
  "--mdw-blockquote-fg", "--mdw-blockquote-border", "--mdw-control-border", "--mdw-control-highlight",
  "--mdw-control-shadow", "--mdw-control-pressed-shadow", "--mdw-separator-color", "--mdw-popover-bg",
  "--mdw-popover-shadow", "--mdw-menu-hover-bg", "--mdw-danger-fg", "--mdw-danger-hover-fg",
  "--mdw-table-picker-selected-bg", "--mdw-link-fg", "--mdw-link-visited-fg",
];

const channel = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
const lum = (hex: string) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((x) => x + x).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(full.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (x: string, y: string) => {
  const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};
const isHex = (c: string | undefined): c is string => !!c && /^#[0-9a-f]{3,6}$/i.test(c);

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

  // Bug pdf-mermaid-missing: mdwysiwyg draws Mermaid with its default theme (dark strokes and labels, many
  // diagrams without fill), so the diagram background must be light in every style or sequence/Gantt/pie
  // diagrams become invisible on screen and in every export.
  // mdwysiwyg 0.5.0 themes code, quotes, links, menus and popovers: every style must keep them legible
  it("keeps text, links, quotes and popovers readable in every style (contrast >= 4.5:1)", () => {
    for (const s of EDITOR_STYLES) {
      const v = s.vars;
      const pairs: [string, string, string][] = [
        ["popover text", v["--mdw-fg"], v["--mdw-popover-bg"]],
        ["base text", v["--mdw-fg"], v["--mdw-bg"]],
      ];
      if (isHex(v["--mdw-content-bg"])) {
        for (const k of ["--mdw-content-wysiwyg-fg", "--mdw-link-fg", "--mdw-link-visited-fg", "--mdw-blockquote-fg"]) {
          pairs.push([k, v[k], v["--mdw-content-bg"]]);
        }
      }
      for (const [name, fg, bg] of pairs) expect(contrast(fg, bg), `${s.id}: ${name} ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps syntax highlighting readable on the code block (>= 3:1; Default keeps the editor's own palette)", () => {
    for (const s of EDITOR_STYLES.filter((x) => x.id !== "default")) {
      for (const k of ["--mdw-code-keyword", "--mdw-code-string", "--mdw-code-comment", "--mdw-code-number", "--mdw-code-title"]) {
        expect(contrast(s.vars[k], s.vars["--mdw-code-block-bg"]), `${s.id}: ${k}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("Default uses mdwysiwyg's own default values (same look as the plain editor)", () => {
    const d = EDITOR_STYLES.find((x) => x.id === "default")!.vars;
    expect([d["--mdw-bg"], d["--mdw-fg"], d["--mdw-code-keyword"], d["--mdw-link-fg"], d["--mdw-popover-bg"]]).toEqual([
      "#ffffff", "#1f2328", "#a626a4", "#0000ee", "#ffffff",
    ]);
  });

  it("keeps the Mermaid background readable under Mermaid's default dark strokes (contrast >= 4.5:1)", () => {
    const MERMAID_INK = "#333333"; // default theme line/text colour
    const channel = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
    const lum = (hex: string) => {
      const h = hex.replace("#", "");
      const full = h.length === 3 ? [...h].map((x) => x + x).join("") : h;
      const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(full.slice(i, i + 2), 16)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    for (const s of EDITOR_STYLES) {
      const bg = s.vars["--mdw-mermaid-bg"];
      expect(bg, `${s.id} mermaid bg must be a plain hex colour`).toMatch(/^#[0-9a-f]{3,6}$/i);
      expect(contrast(bg, MERMAID_INK), `${s.id} (${bg})`).toBeGreaterThanOrEqual(4.5);
    }
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
