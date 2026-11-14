// Basic mode of the Temas panel (spec 004 US3): a few base colours -> every editor variable, legible by
// construction (text >= 4.5:1, syntax >= 3:1, light Mermaid background as required by bug pdf-mermaid-missing).
import type { StyleVars } from "../settings/editorStyles";
import { contrast, hex, parseColor, type Rgb } from "../export/native/color";

export interface BaseColors {
  bg: string;
  fg: string;
  accent: string;
  border: string;
  bar: string;
  barFg?: string;
  font?: string;
  mono?: string;
}

const rgb = (c: string, fallback: Rgb): Rgb => parseColor(c) ?? fallback;
const toHex = (c: Rgb) => `#${hex(c).toLowerCase()}`;
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as Rgb;
const mix = (a: string, b: string, t: number) => toHex(mixRgb(rgb(a, [255, 255, 255]), rgb(b, [0, 0, 0]), t));
const lum = (c: Rgb) => {
  const ch = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
};

/** Moves `fg` towards black/white until it reaches `min` contrast on `bg`. */
export function ensureContrast(fg: string, bg: string, min: number): string {
  const b = rgb(bg, [255, 255, 255]);
  let f = rgb(fg, [0, 0, 0]);
  // towards whichever extreme can contrast more with this background (mid greys only reach 4.5 with black)
  const target: Rgb = contrast([0, 0, 0], b) >= contrast([255, 255, 255], b) ? [0, 0, 0] : [255, 255, 255];
  for (let i = 0; i < 20 && contrast(f, b) < min; i++) f = mixRgb(f, target, 0.15);
  return toHex(contrast(f, b) >= min ? f : target);
}

export const isDarkColor = (c: string) => lum(rgb(c, [255, 255, 255])) < 0.2;

const MERMAID_INK = "#333333";

export function deriveVars(base: BaseColors): StyleVars {
  const dark = isDarkColor(base.bg);
  const fg = ensureContrast(base.fg, base.bg, 4.5);
  const muted = mix(base.bg, fg, 0.06);
  const codeBg = muted;
  const barFg = base.barFg ? ensureContrast(base.barFg, base.bar, 4.5) : lum(rgb(base.bar, [200, 200, 200])) > 0.4 ? "#1f2328" : "#f5f5f5";
  const popover = dark ? mix(base.bg, "#ffffff", 0.06) : "#ffffff";
  let mermaidBg = dark ? mix(base.bg, "#ffffff", 0.88) : muted;
  if (contrast(rgb(mermaidBg, [255, 255, 255]), rgb(MERMAID_INK, [51, 51, 51])) < 4.5) mermaidBg = "#f6f7f9";
  const tokens = dark
    ? { kw: "#c792ea", str: "#a5d6a7", com: "#94a3b8", num: "#f9a66c", title: "#82aaff" }
    : { kw: "#a626a4", str: "#3d7a3d", com: "#6b6f76", num: "#8a5a00", title: "#2a5bd7" };
  const link = ensureContrast(base.accent, base.bg, 4.5);
  const font = base.font ?? "system-ui, sans-serif";
  const mono = base.mono ?? "ui-monospace, Consolas, monospace";
  return {
    "--mdw-bg": base.bg,
    "--mdw-fg": fg,
    "--mdw-muted": muted,
    "--mdw-border": base.border,
    "--mdw-accent": base.accent,
    "--mdw-toolbar-gradient-from": mix(base.bar, "#ffffff", 0.25),
    "--mdw-toolbar-gradient-via": base.bar,
    "--mdw-toolbar-gradient-to": mix(base.bar, "#000000", 0.12),
    "--mdw-toolbar-fg": barFg,
    "--mdw-toolbar-font-family": font,
    "--mdw-toolbar-select-bg": mix(base.bar, base.bg, 0.5),
    "--mdw-button-active-bg": mix(base.bar, barFg, 0.2),
    "--mdw-button-hover-gradient-from": mix(base.bar, "#ffffff", 0.4),
    "--mdw-button-hover-gradient-to": base.bar,
    "--mdw-content-bg": base.bg,
    "--mdw-content-wysiwyg-fg": fg,
    "--mdw-content-wysiwyg-font-family": font,
    "--mdw-content-markdown-fg": fg,
    "--mdw-content-markdown-font-family": mono,
    "--mdw-scrollbar-thumb": mix(base.bg, fg, 0.35),
    "--mdw-scrollbar-track": base.bg,
    "--mdw-table-header-bg": mix(base.bg, fg, 0.1),
    "--mdw-code-block-bg": codeBg,
    "--mdw-mermaid-bg": mermaidBg,
    "--mdw-code-keyword": ensureContrast(tokens.kw, codeBg, 3),
    "--mdw-code-string": ensureContrast(tokens.str, codeBg, 3),
    "--mdw-code-comment": ensureContrast(tokens.com, codeBg, 3),
    "--mdw-code-number": ensureContrast(tokens.num, codeBg, 3),
    "--mdw-code-title": ensureContrast(tokens.title, codeBg, 3),
    "--mdw-blockquote-fg": ensureContrast(mix(fg, base.bg, 0.25), base.bg, 4.5),
    "--mdw-blockquote-border": base.border,
    "--mdw-control-border": mix(fg, base.bg, 0.5),
    "--mdw-control-highlight": dark ? mix(base.bg, "#ffffff", 0.1) : "#ffffff",
    "--mdw-control-shadow": dark ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.15)",
    "--mdw-control-pressed-shadow": dark ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.25)",
    "--mdw-separator-color": mix(fg, base.bg, 0.6),
    "--mdw-popover-bg": popover,
    "--mdw-popover-shadow": "0 4px 12px rgba(0, 0, 0, 0.3)",
    "--mdw-menu-hover-bg": mix(popover, fg, 0.1),
    "--mdw-danger-fg": dark ? "#f87171" : "#b42318",
    "--mdw-danger-hover-fg": dark ? "#fca5a5" : "#8c1c11",
    "--mdw-table-picker-selected-bg": mix(base.accent, base.bg, 0.6),
    "--mdw-link-fg": link,
    "--mdw-link-visited-fg": ensureContrast(mix(link, "#7c3aed", 0.5), base.bg, 4.5),
  };
}

/** Best-effort base colours of an existing style (to start a copy in basic mode). */
export function baseOf(vars: StyleVars): BaseColors {
  const solid = (v: string | undefined, fb: string) => (v && parseColor(v) ? v : fb);
  const bg = solid(vars["--mdw-content-bg"], solid(vars["--mdw-bg"], "#ffffff"));
  return {
    bg,
    fg: solid(vars["--mdw-content-wysiwyg-fg"], solid(vars["--mdw-fg"], "#1f2328")),
    accent: solid(vars["--mdw-accent"], solid(vars["--mdw-button-active-bg"], "#3d6fd8")),
    border: solid(vars["--mdw-border"], "#d0d4da"),
    bar: solid(vars["--mdw-toolbar-gradient-via"], "#dcdcdc"),
    barFg: solid(vars["--mdw-toolbar-fg"], "#222222"),
    font: vars["--mdw-content-wysiwyg-font-family"],
    mono: vars["--mdw-content-markdown-font-family"],
  };
}

/** Variable groups shown in the advanced mode (spec 004 FR-008). */
export const VAR_GROUPS: { title: string; vars: [string, string][] }[] = [
  { title: "Base", vars: [["--mdw-bg", "Fondo"], ["--mdw-fg", "Texto"], ["--mdw-muted", "Fondo suave"], ["--mdw-border", "Bordes"], ["--mdw-accent", "Acento"]] },
  {
    title: "Barra",
    vars: [
      ["--mdw-toolbar-gradient-from", "Degradado (inicio)"], ["--mdw-toolbar-gradient-via", "Degradado (medio)"], ["--mdw-toolbar-gradient-to", "Degradado (fin)"],
      ["--mdw-toolbar-fg", "Texto e iconos"], ["--mdw-toolbar-select-bg", "Selector de encabezado"], ["--mdw-button-active-bg", "Botón activo"],
      ["--mdw-button-hover-gradient-from", "Botón en hover (inicio)"], ["--mdw-button-hover-gradient-to", "Botón en hover (fin)"],
    ],
  },
  {
    title: "Contenido",
    vars: [["--mdw-content-bg", "Fondo del contenido"], ["--mdw-content-wysiwyg-fg", "Texto (vista renderizada)"], ["--mdw-content-markdown-fg", "Texto (vista Markdown)"], ["--mdw-scrollbar-thumb", "Barra de desplazamiento"], ["--mdw-scrollbar-track", "Fondo de la barra de desplazamiento"]],
  },
  { title: "Código", vars: [["--mdw-code-block-bg", "Fondo"], ["--mdw-code-keyword", "Palabras clave"], ["--mdw-code-string", "Cadenas"], ["--mdw-code-comment", "Comentarios"], ["--mdw-code-number", "Números"], ["--mdw-code-title", "Títulos/funciones"]] },
  { title: "Tablas y diagramas", vars: [["--mdw-table-header-bg", "Encabezado de tabla"], ["--mdw-table-picker-selected-bg", "Selector de tamaño"], ["--mdw-mermaid-bg", "Fondo de diagramas"]] },
  { title: "Citas y enlaces", vars: [["--mdw-blockquote-fg", "Texto de cita"], ["--mdw-blockquote-border", "Línea de cita"], ["--mdw-link-fg", "Enlace"], ["--mdw-link-visited-fg", "Enlace visitado"]] },
  {
    title: "Controles y paneles",
    vars: [
      ["--mdw-control-border", "Borde de controles"], ["--mdw-control-highlight", "Brillo de controles"], ["--mdw-separator-color", "Separadores"],
      ["--mdw-popover-bg", "Fondo de menús y diálogos"], ["--mdw-menu-hover-bg", "Opción resaltada"], ["--mdw-danger-fg", "Acción peligrosa"], ["--mdw-danger-hover-fg", "Acción peligrosa (hover)"],
    ],
  },
];

export const FONT_CHOICES = [
  "system-ui, sans-serif",
  "Segoe UI, sans-serif",
  "Arial, sans-serif",
  "Verdana, sans-serif",
  "Georgia, serif",
  "Times New Roman, serif",
  "Trebuchet MS, sans-serif",
  "ui-monospace, Consolas, monospace",
  "Courier New, monospace",
];

/** Text/background pairs checked for contrast in the panel (FR-009). */
export function contrastWarnings(vars: StyleVars): string[] {
  const out: string[] = [];
  const check = (label: string, fgVar: string, bgVar: string | null, min: number, fixedBg?: string) => {
    const f = parseColor(vars[fgVar]);
    const b = parseColor(fixedBg ?? (bgVar ? vars[bgVar] : undefined));
    if (!f || !b) return;
    const c = contrast(f, b);
    if (c < min) out.push(`${label}: contraste ${c.toFixed(1)}:1 (mínimo ${min}:1)`);
  };
  check("Texto sobre el fondo", "--mdw-content-wysiwyg-fg", "--mdw-content-bg", 4.5);
  check("Enlaces", "--mdw-link-fg", "--mdw-content-bg", 4.5);
  check("Citas", "--mdw-blockquote-fg", "--mdw-content-bg", 4.5);
  check("Texto de menús y diálogos", "--mdw-fg", "--mdw-popover-bg", 4.5);
  check("Barra de herramientas", "--mdw-toolbar-fg", "--mdw-toolbar-gradient-via", 4.5);
  for (const k of ["keyword", "string", "comment", "number", "title"]) check(`Código (${k})`, `--mdw-code-${k}`, "--mdw-code-block-bg", 3);
  const m = parseColor(vars["--mdw-mermaid-bg"]);
  if (m && contrast(m, [51, 51, 51]) < 4.5) out.push("Fondo de diagramas: demasiado oscuro para los trazos de Mermaid (los diagramas se verían vacíos)");
  return out;
}
