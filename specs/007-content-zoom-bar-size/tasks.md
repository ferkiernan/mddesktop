---
description: "Tareas: zoom del contenido y tamaño de las barras"
---

# Tasks: Zoom del contenido y tamaño de las barras

**Tests**: se escriben con el código y se ejecutan al terminar toda la codificación.

- [X] T001 Preferencias `contentZoom` y `barScale`, saneado a pasos de 5 % y migración desde `uiZoom` en `src-tauri/src/services/app_data.rs` (+ prueba Rust); zod y defaults
- [X] T002 [US1] Zoom del contenido: CSS con ámbito a editores visibles, pasos de 5 %, límites con aviso, anclaje del scroll (`src/features/settings/zoom.ts`), menú Ver (`menu.rs`), atajos (`manager.ts`), barra de estado (`StatusBar.tsx`)
- [X] T003 [US2] Ctrl+rueda solo sobre el contenido, acumulando ruedas finas y bloqueando el zoom del WebView (`startWheelZoom`, `App.tsx`)
- [X] T004 [US3] "Ajuste tamaño de barra" en el panel Temas: barra de pestañas (CSS `--mdd-bar-scale`) + barra del editor (`--mdw-toolbar-scale`)
- [X] T005 [US4] Sin zoom global (`<html>`), exportación sin zoom (visor fuera de `.editor-slot`, `--mdw-content-zoom: 1`), 001 FR-017 enmendado
- [X] T006 [P] Vitest: pasos/límites/redondeo, CSS con ámbito, Ctrl+rueda (acumulación, fuera del contenido no cambia), en `tests/unit/themes-zoom.spec.ts`
- [X] T007 [P] Playwright: menú y atajos cambian solo el contenido (barra de pestañas igual), barra de estado, persistencia, en `tests/e2e/ui/themes-zoom.spec.ts`
- [X] T008 Nativa: exportar a PDF con zoom 150 % da las mismas páginas que a 100 % en `tests/e2e/native/export-long.cdp.mjs`
