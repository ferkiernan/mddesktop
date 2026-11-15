# Data Model: 004

## CustomStyle (`styles.json` = `{ version: 1, styles: CustomStyle[] }`)

| Campo | Tipo | Reglas |
|---|---|---|
| id | string | `custom-[a-z0-9-]{1,25}`, único |
| label | string | 1–40 caracteres, sin control; único sin distinguir mayúsculas, también frente a los incluidos |
| base | mapa | claves `bg, fg, accent, border, bar, barFg, tabsBg, font, mono` |
| overrides | mapa | `--mdw-*` / `--mdd-*` → valor CSS validado |
| createdAt, updatedAt | número | milisegundos |

Máximo 200 estilos. Variables finales = `deriveVars(base)` + `overrides`.

## Preferencias relacionadas
- `editorStyle` admite ids `custom-*`; si el estilo desaparece se vuelve a `default`.
