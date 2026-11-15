// Temas panel (spec 004 + 007 US3): create and manage your own styles with a live preview, and adjust the size
// of the bars. A large modal panel inside the main window (clarification 2026-11-14).
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { CustomStyle } from "../../services/contracts";
import { ask } from "../../ui/dialogs";
import { chromeOf } from "../settings/applyStyle";
import { setEditorStyle } from "../settings/appearance";
import { EDITOR_STYLES, type StyleVars } from "../settings/editorStyles";
import { useSettings } from "../settings/store";
import { BAR_MAX, BAR_MIN, percent, setBarScale } from "../settings/zoom";
import { LazyMarkdownEditor } from "../editor/lazy";
import { copyName, nameProblem, newStyleId, useStyleCatalog, varsOf } from "./catalog";
import { FONT_CHOICES, VAR_GROUPS, baseOf, contrastWarnings, deriveVars, type BaseColors } from "./derive";
import { closeThemesPanel } from "./themesPanelStore";
import { parseColor, hex } from "../export/native/color";

const SAMPLE = `# Vista previa del estilo

Texto con **negrita**, *cursiva*, \`código en línea\` y un [enlace](https://example.com).

> Una cita para ver su color y su línea.

- [x] Tarea hecha
- [ ] Tarea pendiente

| Columna | Valor |
|---|---:|
| Uno | 1 |
| Dos | 2 |

\`\`\`ts
// comentario
function saludar(nombre: string): number {
  return "Hola, " + nombre.length + 42;
}
\`\`\`

\`\`\`mermaid
sequenceDiagram
  A->>B: Hola
  B-->>A: Chau
\`\`\`
`;

const BASIC: [keyof BaseColors, string][] = [
  ["bg", "Fondo"],
  ["fg", "Texto"],
  ["accent", "Acento (enlaces y selección)"],
  ["border", "Bordes"],
  ["bar", "Barra de herramientas"],
  ["tabsBg", "Fondo de la barra de pestañas"],
];

interface Draft {
  id: string;
  label: string;
  base: BaseColors;
  overrides: StyleVars;
  createdAt: number;
  isNew: boolean;
}

/**
 * `#rrggbb` for the colour picker. Any CSS colour is resolved by the browser (names, `hsl()`, …);
 * for a gradient the first colour stop is used. Null only when nothing colour-like can be read.
 */
function pickerValue(v: string | undefined): string | null {
  if (!v) return null;
  const direct = parseColor(v);
  if (direct) return `#${hex(direct).toLowerCase()}`;
  const candidates = [v, ...(v.match(/(#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)|\b[a-z]+\b)/gi) ?? [])];
  const probe = document.createElement("span");
  document.body.appendChild(probe);
  try {
    for (const c of candidates) {
      if (!CSS.supports("color", c)) continue;
      probe.style.color = "";
      probe.style.color = c;
      const rgb = parseColor(getComputedStyle(probe).color);
      if (rgb) return `#${hex(rgb).toLowerCase()}`;
    }
  } finally {
    probe.remove();
  }
  return null;
}

/** Circular-arrow "reset" icon drawn with the text colour. */
const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M3.5 8a4.5 4.5 0 1 0 1.32-3.18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M4.2 1.8v3.2h3.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function isValidCss(v: string): boolean {
  const safe = v.length > 0 && v.length <= 240 && /^[\w #(),.%'"+-]+$/.test(v) && !/url\(|expression/i.test(v);
  return safe && (CSS.supports("color", v) || CSS.supports("background", v));
}

function ColorField({ label, value, onChange, onReset, custom, fallback }: { label: string; value: string; onChange(v: string): void; onReset?(): void; custom?: boolean; fallback?: string }) {
  // the text box shows the current value except while the user is typing in it
  const [editing, setEditing] = useState<string | null>(null);
  const [badFor, setBadFor] = useState<string | null>(null);
  const bad = badFor === value;
  const text = editing ?? value;
  // an optional colour that is not set yet starts the picker from what is shown today (`fallback`)
  // every field has a picker (spec 012 FR-006), even when the value cannot be shown as a single colour
  const picker = pickerValue(value) ?? (fallback ? pickerValue(fallback) : null) ?? "#000000";
  return (
    <div className={`theme-field${custom ? " custom" : ""}`}>
      <span className="theme-field-label">{label}{custom ? " ·" : ""}</span>
      <input type="color" aria-label={`${label}: selector de color`} value={picker} onChange={(e) => onChange(e.target.value)} />
      <input
        type="text"
        aria-label={`${label}: valor`}
        aria-invalid={bad}
        value={text}
        placeholder={fallback ? "automático" : undefined}
        onFocus={() => setEditing(value)}
        onChange={(e) => setEditing(e.target.value)}
        onBlur={() => {
          const t = text.trim();
          setEditing(null);
          if (!t && fallback) onReset?.();
          else if (isValidCss(t)) onChange(t);
          else setBadFor(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      {onReset && custom ? (
        <button type="button" className="theme-reset" onClick={onReset} title="Restablecer" aria-label={`Restablecer ${label}`}>
          <ResetIcon />
        </button>
      ) : (
        <span className="theme-reset-slot" aria-hidden="true" />
      )}
      {bad && <span className="theme-field-error" role="alert">Color no válido</span>}
    </div>
  );
}

const now = () => Date.now();

const draftOf = (s: CustomStyle): Draft => ({
  id: s.id,
  label: s.label,
  base: s.base as unknown as BaseColors,
  overrides: s.overrides,
  createdAt: s.createdAt,
  isNew: false,
});

function newDraft(label: string, source: { base: BaseColors; overrides: StyleVars }): Draft {
  return { id: newStyleId(), label, ...source, createdAt: now(), isNew: true };
}

export default function ThemesPanel() {
  const custom = useStyleCatalog((s) => s.custom);
  const active = useSettings((s) => s.prefs.editorStyle);
  const barScale = useSettings((s) => s.prefs.barScale);
  const [selected, setSelected] = useState<string>(active);
  /** Unsaved edits (or a new style); null = showing the saved style. */
  const [edits, setEdits] = useState<Draft | null>(null);
  const dirty = edits !== null;
  const [mode, setMode] = useState<"basic" | "advanced">("basic");
  const [error, setError] = useState("");
  const [previewVars, setPreviewVars] = useState<StyleVars>({});
  const debounce = useRef<number | undefined>(undefined);

  const builtIn = EDITOR_STYLES.find((s) => s.id === selected);
  const savedCustom = custom.find((s) => s.id === selected);

  // what the editor shows: the unsaved edits, else the selected custom style (built-ins are read-only)
  const draft: Draft | null = useMemo(() => edits ?? (savedCustom ? draftOf(savedCustom) : null), [edits, savedCustom]);

  const vars: StyleVars = useMemo(() => {
    if (draft) return varsOf({ base: draft.base as unknown as Record<string, string>, overrides: draft.overrides });
    return builtIn?.vars ?? EDITOR_STYLES[0].vars;
  }, [draft, builtIn]);

  // preview follows the colour pickers while dragging, debounced to one frame-ish
  useEffect(() => {
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => setPreviewVars(vars), 30);
    return () => window.clearTimeout(debounce.current);
  }, [vars]);

  const warnings = useMemo(() => contrastWarnings(vars), [vars]);
  const derived = useMemo(() => (draft ? deriveVars(draft.base) : {}), [draft]);
  const chrome = chromeOf({ id: "preview", label: "", vars });

  const confirmLeave = async (): Promise<boolean> => {
    if (!dirty) return true;
    const choice = await ask({
      title: "Cambios sin guardar",
      message: `El estilo "${draft?.label}" tiene cambios sin guardar.`,
      buttons: [
        { label: "Cancelar", value: "cancel" },
        { label: "Descartar", value: "discard" },
        { label: "Guardar", value: "save", primary: true },
      ],
    });
    if (choice === "cancel") return false;
    if (choice === "save") return save();
    setEdits(null);
    return true;
  };

  const select = async (id: string) => {
    if (id === selected || !(await confirmLeave())) return;
    setError("");
    setSelected(id);
  };

  const startCopy = async () => {
    if (!(await confirmLeave())) return;
    const label = copyName(builtIn?.label ?? savedCustom?.label ?? "estilo", custom);
    const source = builtIn ? { base: baseOf(builtIn.vars), overrides: { ...builtIn.vars } } : { base: draft!.base, overrides: { ...draft!.overrides } };
    const copy = newDraft(label, source);
    setEdits(copy);
    setSelected(copy.id);
    setError("");
  };

  const edit = (fn: (d: Draft) => Draft) => {
    if (draft) setEdits(fn(draft));
  };

  const save = async (): Promise<boolean> => {
    if (!draft) return false;
    const problem = nameProblem(draft.label, draft.id, custom);
    if (problem) {
      setError(problem);
      return false;
    }
    const style: CustomStyle = {
      id: draft.id,
      label: draft.label.trim(),
      base: draft.base as unknown as Record<string, string>,
      overrides: draft.overrides,
      createdAt: draft.createdAt,
      updatedAt: now(),
    };
    const list = draft.isNew ? [...custom, style] : custom.map((s) => (s.id === style.id ? style : s));
    try {
      await useStyleCatalog.getState().save(list);
      setEdits(null); // the saved style is shown from the catalogue
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
      return false;
    }
  };

  const remove = async () => {
    if (!savedCustom) return;
    const choice = await ask({
      title: "Eliminar estilo",
      message: `¿Eliminar "${savedCustom.label}"? No se puede deshacer.`,
      buttons: [
        { label: "Cancelar", value: "cancel" },
        { label: "Eliminar", value: "delete", primary: true },
      ],
    });
    if (choice !== "delete") return;
    await useStyleCatalog.getState().save(custom.filter((s) => s.id !== savedCustom.id));
    setEdits(null);
    setSelected("default");
  };

  const apply = async () => {
    if (dirty && !(await save())) return;
    await setEditorStyle(selected);
  };

  const close = async () => {
    if (await confirmLeave()) closeThemesPanel();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector(".dialog")) {
        e.preventDefault();
        e.stopPropagation();
        void close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const setBase = (k: keyof BaseColors, v: string) => edit((d) => ({ ...d, base: { ...d.base, [k]: v }, overrides: mode === "basic" ? {} : d.overrides }));
  /** Optional basic colours (tab bar background): back to the derived look. */
  const clearBase = (k: keyof BaseColors) =>
    edit((d) => {
      const b = { ...d.base };
      delete b[k];
      return { ...d, base: b };
    });
  const setVar = (k: string, v: string) => edit((d) => ({ ...d, overrides: { ...d.overrides, [k]: v } }));
  const resetVar = (k: string) =>
    edit((d) => {
      const o = { ...d.overrides };
      delete o[k];
      return { ...d, overrides: o };
    });

  const editable = !!draft;
  const listed = [...EDITOR_STYLES.map((s) => ({ id: s.id, label: s.label, builtIn: true })), ...custom.map((s) => ({ id: s.id, label: s.label, builtIn: false }))];
  if (draft?.isNew) listed.push({ id: draft.id, label: draft.label || "(sin nombre)", builtIn: false });

  return (
    <div className="dialog-backdrop">
      <div className="themes-panel" role="dialog" aria-modal="true" aria-labelledby="themes-title">
        <header className="themes-head">
          <h2 id="themes-title">Temas</h2>
          <label className="themes-bar-size">
            Ajuste tamaño de barra
            <input
              type="range"
              min={BAR_MIN * 100}
              max={BAR_MAX * 100}
              step={5}
              value={Math.round(barScale * 100)}
              aria-valuetext={percent(barScale)}
              onChange={(e) => void setBarScale(Number(e.target.value) / 100)}
            />
            <span>{percent(barScale)}</span>
            <button type="button" onClick={() => void setBarScale(1)} disabled={barScale === 1}>
              100 %
            </button>
          </label>
        </header>
        <div className="themes-body">
          <nav className="themes-list" aria-label="Estilos">
            <ul role="listbox" aria-label="Estilos">
              {listed.map((s) => (
                <li key={s.id} role="option" aria-selected={s.id === selected}>
                  <button type="button" className={s.id === selected ? "selected" : ""} onClick={() => void select(s.id)}>
                    {/* spec 009: built-in styles in bold; "incluido" only for assistive technology */}
                    <span className={s.builtIn ? "theme-builtin" : undefined}>{s.label}</span>
                    {s.builtIn ? <span className="sr-only"> (estilo incluido)</span> : null}
                    {s.id === active ? <small> · activo</small> : null}
                  </button>
                </li>
              ))}
            </ul>
            <div className="themes-list-actions">
              <button type="button" onClick={() => void startCopy()}>{builtIn ? "Duplicar" : "Nuevo a partir de este"}</button>
              <button type="button" onClick={() => void remove()} disabled={!savedCustom} title={savedCustom ? "Eliminar este estilo" : "Los estilos incluidos no se pueden eliminar"}>
                Eliminar
              </button>
            </div>
          </nav>
          <section className="themes-editor" aria-label="Colores del estilo">
            {editable ? (
              <>
                <label className="theme-name">
                  Nombre
                  <input type="text" maxLength={40} value={draft.label} onChange={(e) => edit((d) => ({ ...d, label: e.target.value }))} />
                </label>
                <div className="themes-mode" role="tablist" aria-label="Modo de edición">
                  <button type="button" role="tab" aria-selected={mode === "basic"} onClick={() => setMode("basic")}>
                    Básico
                  </button>
                  <button type="button" role="tab" aria-selected={mode === "advanced"} onClick={() => setMode("advanced")}>
                    Avanzado
                  </button>
                </div>
                {mode === "basic" ? (
                  <div className="themes-fields">
                    {BASIC.map(([k, label]) => (
                      <ColorField
                        key={k}
                        label={label}
                        value={String(draft.base[k] ?? "")}
                        onChange={(v) => setBase(k, v)}
                        {...(k === "tabsBg" ? { fallback: draft.base.bar, custom: !!draft.base.tabsBg, onReset: () => clearBase("tabsBg") } : {})}
                      />
                    ))}
                    <label className="theme-field">
                      <span className="theme-field-label">Tipografía</span>
                      <select value={draft.base.font ?? FONT_CHOICES[0]} onChange={(e) => setBase("font", e.target.value)}>
                        {[...new Set([draft.base.font ?? FONT_CHOICES[0], ...FONT_CHOICES])].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                    {Object.keys(draft.overrides).length > 0 && (
                      <p className="themes-note">Este estilo tiene {Object.keys(draft.overrides).length} valores personalizados (modo avanzado); cambiar un color básico los descarta.</p>
                    )}
                  </div>
                ) : (
                  <div className="themes-fields">
                    {VAR_GROUPS.map((g) => (
                      <fieldset key={g.title}>
                        <legend>{g.title}</legend>
                        {g.vars.map(([k, label]) => (
                          <ColorField key={k} label={label} value={vars[k] ?? derived[k] ?? ""} custom={k in draft.overrides} onChange={(v) => setVar(k, v)} onReset={() => resetVar(k)} />
                        ))}
                      </fieldset>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="themes-note">"{builtIn?.label}" es un estilo incluido: no se puede modificar. Usa "Duplicar" para crear una copia editable.</p>
            )}
            {warnings.length > 0 && (
              <ul className="themes-warnings" aria-label="Avisos de contraste">
                {warnings.map((w) => (
                  <li key={w}>⚠ {w}</li>
                ))}
              </ul>
            )}
            {error && <p className="theme-field-error" role="alert">{error}</p>}
          </section>
          <section className="themes-preview" aria-label="Vista previa">
            <div className="themes-preview-tabs" style={{ background: chrome.tabsBg, color: chrome.tabsFg }}>
              <span className="tab" aria-hidden="true" style={{ background: chrome.bg, color: chrome.fg }}>documento.md</span>
            </div>
            <div className="themes-preview-editor" style={{ ...previewVars, ["--mdw-toolbar-scale" as string]: String(barScale) } as CSSProperties}>
              <LazyMarkdownEditor initialContent={SAMPLE} width="100%" height="100%" resizable={false} className="mdd-theme-preview" historyUndo={false} />
            </div>
          </section>
        </div>
        <div className="dialog-actions">
          <button type="button" onClick={() => void close()}>Cerrar</button>
          <button type="button" onClick={() => void save()} disabled={!editable || !dirty} title={!editable ? "Los estilos incluidos no se modifican: usa Duplicar" : !dirty ? "No hay cambios para guardar" : "Guardar el estilo"}>
            Guardar
          </button>
          <button type="button" className="primary" onClick={() => void apply()} disabled={selected === active && !dirty}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

