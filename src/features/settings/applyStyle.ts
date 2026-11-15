// Applies an editor style preset: the mdwysiwyg variables go to the editor root (README "Theming":
// override them on the component's className) and a few derived variables restyle the app chrome
// (tabs, status bar, dialogs) so the whole window matches the chosen look.
import { EDITOR_STYLES, type EditorStyle } from "./editorStyles";
import { contrast, parseColor } from "../export/native/color";

export const EDITOR_CLASS = "mdd-editor";
export const DEFAULT_STYLE_ID = "default";
const STYLE_EL_ID = "mdd-editor-styles";

/** The user's own styles (spec 004), registered by the style catalogue. */
let customStyles: EditorStyle[] = [];

/** Built-in plus custom styles. */
export const allStyles = (): EditorStyle[] => [...EDITOR_STYLES, ...customStyles];

export const findStyle = (id: string): EditorStyle =>
  allStyles().find((s) => s.id === id) ?? EDITOR_STYLES.find((s) => s.id === DEFAULT_STYLE_ID)!;

/** Replaces the custom styles and refreshes the scoped stylesheet. */
export function registerCustomStyles(list: EditorStyle[]) {
  customStyles = list;
  const el = document.getElementById(STYLE_EL_ID);
  if (el) el.textContent = allStyles().map(styleCss).join("\n\n");
}

export function styleCss(style: EditorStyle): string {
  const decls = Object.entries(style.vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `html[data-editor-style="${style.id}"] .${EDITOR_CLASS} {\n${decls}\n}`;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Relative luminance (0..1) of a #rgb/#rrggbb colour, or null when it is not a plain hex. */
export function luminance(color: string): number | null {
  const c = color.trim();
  if (!HEX.test(c)) return null;
  const h = c.slice(1);
  const full = h.length === 3 ? [...h].map((x) => x + x).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or near-black text for a solid accent colour (contrast against both, keeps the better one). */
export function accentText(accent: string): string {
  const c = parseColor(accent);
  if (!c) return "#ffffff";
  return contrast(c, [255, 255, 255]) >= contrast(c, [0, 0, 0]) ? "#ffffff" : "#000000";
}

export interface Chrome {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  /** Text on accent-coloured surfaces (primary buttons): black or white, whichever reads better. */
  accentFg: string;
  border: string;
  bar: string; // tab/status bar background (may be a gradient)
  barFg: string;
  /** Tab bar only (spec 010): its own background when the style sets one, else the bar's. */
  tabsBg: string;
  tabsFg: string;
  font: string;
  dark: boolean;
}

/** App-chrome colours derived from a preset (content-bg may be a gradient, so fall back to a solid). */
export function chromeOf(style: EditorStyle): Chrome {
  const v = style.vars;
  const contentBg = v["--mdw-content-bg"] ?? "#ffffff";
  const bg = luminance(contentBg) !== null ? contentBg : (v["--mdw-toolbar-select-bg"] ?? "#ffffff");
  const fg = v["--mdw-content-wysiwyg-fg"] ?? "#1f2328";
  return {
    bg,
    fg,
    muted: v["--mdw-toolbar-select-bg"] ?? bg,
    // the style's accent (mdwysiwyg >= 0.5); `--mdw-button-active-bg` is a pressed-button grey in light styles,
    // which made primary buttons look disabled (bug panel-buttons-disabled)
    accent: v["--mdw-accent"] ?? v["--mdw-button-active-bg"] ?? "#2563eb",
    accentFg: accentText(v["--mdw-accent"] ?? v["--mdw-button-active-bg"] ?? "#2563eb"),
    border: `color-mix(in srgb, ${fg} 22%, transparent)`,
    bar: `linear-gradient(${v["--mdw-toolbar-gradient-from"]}, ${v["--mdw-toolbar-gradient-via"]}, ${v["--mdw-toolbar-gradient-to"]})`,
    barFg: v["--mdw-toolbar-fg"] ?? fg,
    tabsBg: v["--mdd-tabs-bg"] ?? `linear-gradient(${v["--mdw-toolbar-gradient-from"]}, ${v["--mdw-toolbar-gradient-via"]}, ${v["--mdw-toolbar-gradient-to"]})`,
    tabsFg: v["--mdd-tabs-bg"] ? accentText(v["--mdd-tabs-bg"]) : (v["--mdw-toolbar-fg"] ?? fg),
    font: v["--mdw-toolbar-font-family"] ?? "system-ui, sans-serif",
    dark: (luminance(bg) ?? 1) < 0.4,
  };
}

function ensureStyleElement(): HTMLStyleElement {
  let el = document.getElementById(STYLE_EL_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_EL_ID;
    el.textContent = allStyles().map(styleCss).join("\n\n");
    document.head.appendChild(el);
  }
  return el;
}

export function applyEditorStyle(id: string): EditorStyle {
  const style = findStyle(id);
  ensureStyleElement();
  const root = document.documentElement;
  root.dataset.editorStyle = style.id;
  const c = chromeOf(style);
  root.dataset.theme = c.dark ? "dark" : "light";
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set("--bg", c.bg);
  set("--fg", c.fg);
  set("--muted", c.muted);
  set("--accent", c.accent);
  set("--accent-fg", c.accentFg);
  set("--border", c.border);
  set("--bar-bg", c.bar);
  set("--bar-fg", c.barFg);
  set("--tabs-bg", c.tabsBg);
  set("--tabs-fg", c.tabsFg);
  set("--ui-font", c.font);
  return style;
}
