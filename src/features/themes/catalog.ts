// Style catalogue (spec 004): the user's own styles, persisted by Rust (`styles.json`) and registered wherever
// styles are listed (editor, app chrome, export panel, native menu).
import { create } from "zustand";
import type { CustomStyle } from "../../services/contracts";
import { app, stylesIpc } from "../../services/ipc";
import { ask } from "../../ui/dialogs";
import { DEFAULT_STYLE_ID, applyEditorStyle, registerCustomStyles } from "../settings/applyStyle";
import { EDITOR_STYLES, type EditorStyle } from "../settings/editorStyles";
import { useSettings } from "../settings/store";
import { deriveVars, type BaseColors } from "./derive";

/** Final variables of a custom style: derived from its base colours, with the explicit overrides on top. */
export function varsOf(s: Pick<CustomStyle, "base" | "overrides">): Record<string, string> {
  const base = s.base as unknown as BaseColors;
  const derived = base.bg && base.fg ? deriveVars(base) : {};
  return { ...derived, ...s.overrides };
}

export const toEditorStyle = (s: CustomStyle): EditorStyle => ({ id: s.id, label: s.label, vars: varsOf(s) });

interface Catalog {
  custom: CustomStyle[];
  loaded: boolean;
  load(): Promise<void>;
  /** Persists the whole list (Rust validates); throws with a readable message on failure. */
  save(list: CustomStyle[]): Promise<void>;
}

function publish(list: CustomStyle[]) {
  registerCustomStyles(list.map(toEditorStyle));
  const active = useSettings.getState().prefs.editorStyle;
  app.setCustomStylesMenu(list.map((s) => [s.id, s.label]), active).catch(() => undefined);
  // the active style may have changed values (edited) or disappeared (deleted)
  if (active.startsWith("custom-")) {
    if (list.some((s) => s.id === active)) applyEditorStyle(active);
    else void useSettings.getState().update({ editorStyle: DEFAULT_STYLE_ID });
  }
}

export const useStyleCatalog = create<Catalog>((set) => ({
  custom: [],
  loaded: false,
  async load() {
    try {
      const r = await stylesIpc.load();
      set({ custom: r.styles, loaded: true });
      publish(r.styles);
      if (r.recovered) {
        void ask({
          title: "Estilos propios",
          message: "El archivo de estilos propios estaba dañado: se apartó una copia y se usan los estilos incluidos.",
          buttons: [{ label: "Aceptar", value: "ok", primary: true }],
        });
      }
    } catch {
      set({ loaded: true }); // built-in styles keep working
    }
  },
  async save(list) {
    const saved = await stylesIpc.save(list);
    set({ custom: saved });
    publish(saved);
  },
}));

export const builtInLabels = () => EDITOR_STYLES.map((s) => s.label.toLowerCase());

/** "" when the name is valid and unique (case-insensitive, built-ins included), else the reason. */
export function nameProblem(label: string, selfId: string | null, custom: CustomStyle[]): string {
  const t = label.trim();
  if (!t) return "El nombre no puede estar vacío.";
  if (t.length > 40) return "El nombre admite como máximo 40 caracteres.";
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(t)) return "El nombre tiene caracteres no válidos.";
  const k = t.toLowerCase();
  if (builtInLabels().includes(k) || custom.some((s) => s.id !== selfId && s.label.trim().toLowerCase() === k)) {
    return "Ya existe un estilo con ese nombre.";
  }
  return "";
}

/** A unique "Copia de X" name. */
export function copyName(label: string, custom: CustomStyle[]): string {
  let name = `Copia de ${label}`.slice(0, 40);
  for (let i = 2; nameProblem(name, null, custom); i++) name = `Copia de ${label} (${i})`.slice(0, 40);
  return name;
}

export const newStyleId = () => `custom-${Math.random().toString(36).slice(2, 10)}`;
