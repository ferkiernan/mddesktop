// Specs 004 (custom styles) and 007 (content zoom, bar size).
import { describe, expect, it } from "vitest";
import { contrastWarnings, deriveVars, ensureContrast } from "../../src/features/themes/derive";
import { copyName, nameProblem, varsOf } from "../../src/features/themes/catalog";
import { clampBar, clampZoom, isContentArea, zoomCss } from "../../src/features/settings/zoom";
import { contrast, parseColor } from "../../src/features/export/native/color";
import type { CustomStyle } from "../../src/services/contracts";

const c = (a: string, b: string) => contrast(parseColor(a)!, parseColor(b)!);

describe("basic mode derivation (spec 004 US3)", () => {
  const battery = [
    { bg: "#ffffff", fg: "#222222", accent: "#3366cc", border: "#cccccc", bar: "#dddddd" },
    { bg: "#0b0f14", fg: "#9aa0a6", accent: "#335599", border: "#333333", bar: "#1a1a1a" }, // weak text and accent
    { bg: "#7a7a7a", fg: "#8a8a8a", accent: "#888888", border: "#555555", bar: "#6a6a6a" }, // mid tones
    { bg: "#fef3c7", fg: "#d6b46a", accent: "#fbbf24", border: "#f59e0b", bar: "#fde68a" },
  ];
  it("every derived style is legible: text, links, quotes and popovers >= 4.5:1, code >= 3:1, Mermaid background light", () => {
    for (const b of battery) {
      const v = deriveVars(b);
      expect(c(v["--mdw-content-wysiwyg-fg"], v["--mdw-content-bg"]), JSON.stringify(b)).toBeGreaterThanOrEqual(4.5);
      expect(c(v["--mdw-link-fg"], v["--mdw-content-bg"])).toBeGreaterThanOrEqual(4.5);
      expect(c(v["--mdw-blockquote-fg"], v["--mdw-content-bg"])).toBeGreaterThanOrEqual(4.5);
      expect(c(v["--mdw-toolbar-fg"], v["--mdw-toolbar-gradient-via"])).toBeGreaterThanOrEqual(4.5);
      for (const k of ["keyword", "string", "comment", "number", "title"]) expect(c(v[`--mdw-code-${k}`], v["--mdw-code-block-bg"])).toBeGreaterThanOrEqual(3);
      expect(c(v["--mdw-mermaid-bg"], "#333333")).toBeGreaterThanOrEqual(4.5);
      expect(contrastWarnings(v)).toEqual([]);
    }
  });

  it("ensureContrast only moves a colour when it is needed", () => {
    expect(ensureContrast("#000000", "#ffffff", 4.5)).toBe("#000000");
    expect(c(ensureContrast("#777777", "#808080", 4.5), "#808080")).toBeGreaterThanOrEqual(4.5);
  });

  it("explicit overrides win over derived values and warnings report bad pairs", () => {
    const v = varsOf({ base: { bg: "#ffffff", fg: "#000000", accent: "#00f", border: "#ccc", bar: "#ddd" }, overrides: { "--mdw-mermaid-bg": "#101010" } });
    expect(v["--mdw-mermaid-bg"]).toBe("#101010");
    expect(contrastWarnings(v).join()).toMatch(/diagramas/);
  });
});

describe("custom style names (spec 004 FR-006)", () => {
  const mine = [{ id: "custom-a", label: "Mío" }] as CustomStyle[];
  it("rejects empty, long, duplicated (case-insensitive) and built-in names", () => {
    expect(nameProblem("  ", null, mine)).toMatch(/vacío/);
    expect(nameProblem("x".repeat(41), null, mine)).toMatch(/40/);
    expect(nameProblem("mío", null, mine)).toMatch(/existe/);
    expect(nameProblem("Winamp", null, mine)).toMatch(/existe/);
    expect(nameProblem("Mío", "custom-a", mine)).toBe(""); // renaming to itself
    expect(nameProblem("Café nocturno", null, mine)).toBe("");
    expect(copyName("Mío", [...mine, { id: "custom-b", label: "Copia de Mío" } as CustomStyle])).toBe("Copia de Mío (2)");
  });
});

describe("content zoom and bar size (spec 007)", () => {
  it("steps of 5 % within the limits", () => {
    expect(clampZoom(1.049)).toBe(1.05);
    expect(clampZoom(9)).toBe(3);
    expect(clampZoom(0.1)).toBe(0.5);
    expect(clampBar(0.5)).toBe(0.75);
    expect(clampBar(1.52)).toBe(1.5);
  });

  it("zoom applies only to the visible editors (never to the hidden export viewer)", () => {
    const css = zoomCss(1.5, 1.25);
    expect(css).toContain(".editor-slot .mdd-editor{--mdw-content-zoom:1.5;--mdw-toolbar-scale:1.25}");
    expect(css).toContain(":root{--mdd-bar-scale:1.25}");
    expect(css).not.toMatch(/(^|})\s*\.mdd-editor\{/);
  });

  it("Ctrl+wheel targets only the document area", () => {
    document.body.innerHTML = `<div class="editor-slot"><div class="MarkdownEditor_toolbar"><button id="b">B</button></div><div class="ProseMirror"><p id="p">x</p></div></div><div class="app-tabs" id="t"></div>`;
    expect(isContentArea(document.getElementById("p"))).toBe(true);
    expect(isContentArea(document.getElementById("b"))).toBe(false);
    expect(isContentArea(document.getElementById("t"))).toBe(false);
  });
});

describe("tab bar background (spec 010)", () => {
  it("without a tab colour the tab bar keeps the toolbar look; with one, text is chosen for contrast", async () => {
    const { chromeOf } = await import("../../src/features/settings/applyStyle");
    const base = { bg: "#ffffff", fg: "#111111", accent: "#3366cc", border: "#cccccc", bar: "#dddddd" };
    const plain = chromeOf({ id: "a", label: "a", vars: deriveVars(base) });
    expect(plain.tabsBg).toBe(plain.bar);
    expect(deriveVars(base)["--mdd-tabs-bg"]).toBeUndefined();
    for (const tabsBg of ["#8b0000", "#f5f5dc", "#777777"]) {
      const c = chromeOf({ id: "b", label: "b", vars: deriveVars({ ...base, tabsBg }) });
      expect(c.tabsBg).toBe(tabsBg);
      expect(contrast(parseColor(c.tabsFg)!, parseColor(tabsBg)!), tabsBg).toBeGreaterThanOrEqual(4.5);
    }
  });
});
