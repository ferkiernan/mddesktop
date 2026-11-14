# Data Model: Actualizar el editor a su última versión

## Preferences (settings.json) — campos nuevos

| Campo | Tipo | Default | Validación (Rust `sanitized` + zod) | Uso |
|---|---|---|---|---|
| `editorToolbarVisible` | bool | `true` | valor ausente/ inválido → `true` | prop `showToolbar` de todos los editores; check de Ver |
| `editorHistory` | bool | `true` | valor ausente/ inválido → `true` | prop `historyUndo`; check de Configuración |

Compatibilidad: `#[serde(default)]` ya está en la estructura; archivos sin los campos cargan con los defaults; `version` sigue en 1.

## EditorStyle (editorStyles.ts) — ampliado

- `vars`: de 19 a **39** variables `--mdw-*` (R7). Fuente única para menú (`menu.rs`), interfaz (`applyStyle`), visor de exportación y, más adelante, la vista previa de 004.
- Invariantes (pruebas unitarias):
  - los 7 estilos definen exactamente las 39 variables;
  - contraste ≥ 4,5:1: `--mdw-mermaid-bg` vs `#333333`; texto de contenido vs `--mdw-content-bg`; texto de código vs `--mdw-code-block-bg`; enlaces vs `--mdw-content-bg`; texto de popover vs `--mdw-popover-bg`.

## Estado transitorio del editor (no persistido)

- **Historial de versiones**: en memoria por instancia de editor (máx. 200 versiones, lo gestiona el editor); se descarta con el editor.
