---
description: "Tareas: color de fondo de la barra de pestañas"
---

# Tasks: Color de fondo de la barra de pestañas

**Tests**: se escriben y ejecutan al terminar la codificación (indicación de la persona).

- [X] T001 [US1] `BaseColors.tabsBg` opcional y `--mdd-tabs-bg` en `src/features/themes/derive.ts` (también en el grupo avanzado "Barra")
- [X] T002 [US1] Campo "Fondo de la barra de pestañas" en el modo básico, con valor de partida (color de la barra) y "Restablecer" en `src/features/themes/ThemesPanel.tsx`; vista previa con `tabsBg`/`tabsFg`
- [X] T003 [US1] `chromeOf` → `tabsBg`/`tabsFg` (texto por contraste) y variables `--tabs-bg`/`--tabs-fg` en `src/features/settings/applyStyle.ts`; CSS de la barra y pestañas inactivas en `src/app/theme.css`
- [X] T004 Validación Rust de la clave base `tabsBg` en `src-tauri/src/services/custom_styles.rs`
- [X] T005 [P] Vitest: sin `tabsBg` la barra deriva como antes; con `tabsBg` claro/oscuro el texto contrasta ≥ 4,5:1, en `tests/unit/themes-zoom.spec.ts`
- [X] T006 [P] Playwright: elegir el color en Temas cambia la vista previa, al guardar y aplicar cambia la barra real y no la barra de estado, en `tests/e2e/ui/themes-zoom.spec.ts`
