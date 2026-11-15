# Implementation Plan: Campos de color compactos en "Temas"

**Spec**: [spec.md](./spec.md) · **Fecha**: 2026-11-15

## Resumen técnico

- `ColorField` (`src/features/themes/ThemesPanel.tsx`):
  - Botón de restablecer → icono SVG en línea (flecha circular, `currentColor`), `title="Restablecer"`, `aria-label="Restablecer {campo}"`, en el mismo renglón; si el campo no está modificado se reserva el hueco (`span.theme-reset-slot`).
  - Muestra/selector siempre visible: `pickerValue` resuelve cualquier color CSS con el navegador (elemento de prueba + `getComputedStyle`) y, para degradados, toma el primer color; último recurso `#000000`. Causa del defecto de 010: `parseColor` solo entiende `#hex`/`rgb()`, así que con una barra en otro formato (nombre, `hsl()`, degradado) no había muestra.
- CSS (`src/app/theme.css`): cuadro de valor 150 px → 80 px (53 %), `.theme-reset` 22×22 px sin texto, foco visible; escala con `--mdd-bar-scale` no aplica (el panel no escala).

## Constitución

Sin dependencias nuevas; accesibilidad (nombre accesible, teclado); prueba UI y unitaria.

## Archivos

- `src/features/themes/ThemesPanel.tsx`, `src/app/theme.css`
- `tests/e2e/ui/themes-zoom.spec.ts` (mismo renglón, ayuda, anchos, selector de pestañas)
