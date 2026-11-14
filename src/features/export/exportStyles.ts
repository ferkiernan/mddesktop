// Styles offered by the export panel (spec 005): "Como en pantalla" (the active editor style) plus every
// editor style. Custom styles (spec 004) join through `allStyles()`.
import { allStyles } from "../settings/applyStyle";
import type { StyleVars } from "../settings/editorStyles";

export const SCREEN_STYLE = "screen";

export interface ExportStyleOption {
  id: string;
  label: string;
  /** Variables applied to the hidden viewer; `undefined` = the active style ("Como en pantalla"). */
  vars?: StyleVars;
}

type StyleSource = () => { id: string; label: string; vars: StyleVars }[];
let source: StyleSource = allStyles;

/** Lets other features (custom styles) provide the full style catalogue. */
export function setExportStyleSource(fn: StyleSource) {
  source = fn;
}

export function exportStyleOptions(): ExportStyleOption[] {
  return [
    { id: SCREEN_STYLE, label: "Como en pantalla" },
    ...source().map((s) => ({ id: s.id, label: s.label, vars: s.vars })),
  ];
}

/** The remembered choice, or "Como en pantalla" when that style no longer exists. */
export function resolveExportStyle(id: string | undefined): ExportStyleOption {
  const options = exportStyleOptions();
  return options.find((o) => o.id === id) ?? options[0];
}
