# Implementation Plan: Diseño de los atributos en "Temas"

**Spec**: [spec.md](./spec.md) · **Fecha**: 2026-11-15

## Resumen técnico

- Cada `.theme-field` pasa a ser una grilla de columnas fijas: `nombre (flexible) | muestra 34 px | valor 88 px | restablecer 22 px`. Las columnas fijas alinean todas las filas del panel, no solo las del grupo.
- Nombre: `span.theme-field-label` con el texto en `span.theme-field-name` (corta con "…", `title` con el nombre completo) y la guía de puntos como `::after` flexible (`border-bottom: 2px dotted`, tono tenue `color-mix(--fg 35 %)`).
- Modificado: negrita y botón; se quita el "·".
- "Tipografía": la misma grilla; el `select` ocupa las columnas 2–4.
- Error "Color no válido": fila completa debajo (`grid-column: 1 / -1`).
- Grupos: el `fieldset` ya tiene borde redondeado; se ajusta radio (8 px) y la leyenda.

## Archivos

- `src/features/themes/ThemesPanel.tsx`, `src/app/theme.css`
- `tests/e2e/ui/themes-zoom.spec.ts`
