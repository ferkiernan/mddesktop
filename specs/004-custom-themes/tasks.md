---
description: "Tareas: estilos propios y panel Temas"
---

# Tasks: Estilos propios y panel "Temas"

**Tests**: se escriben con el código y se ejecutan al terminar toda la codificación.

- [X] T001 Almacenamiento `styles.json` con validación y archivo dañado apartado en `src-tauri/src/services/custom_styles.rs` (+ pruebas Rust en el mismo archivo)
- [X] T002 Comandos `styles_load`, `styles_save`, `set_custom_styles_menu` y sección dinámica en el menú (`src-tauri/src/commands/*.rs`, `src-tauri/src/services/menu.rs`, `src-tauri/src/state.rs`), "Temas…" en Configuración
- [X] T003 Contratos zod e IPC (`src/services/contracts.ts`, `src/services/ipc.ts`)
- [X] T004 [US3] Derivación básica, grupos avanzados, fuentes y avisos de contraste en `src/features/themes/derive.ts`
- [X] T005 [US2] [US5] Catálogo: carga al iniciar, guardado, registro en `applyStyle`, exportación y menú; estilo activo eliminado ⇒ predeterminado (`src/features/themes/catalog.ts`, `src/features/settings/applyStyle.ts`, `src/features/export/exportStyles.ts`)
- [X] T006 [US1] [US4] Panel modal con lista, nuevo/duplicar/renombrar/eliminar, básico/avanzado, vista previa en vivo, cambios sin guardar, Escape y teclado (`src/features/themes/ThemesPanel.tsx`, host y estilos)
- [X] T007 [P] Vitest: derivación legible (batería claro/oscuro/medios tonos ≥ 4,5:1), nombres únicos, `varsOf`, avisos, en `tests/unit/themes-zoom.spec.ts`
- [X] T008 [P] Playwright: abrir Temas, duplicar, cambiar fondo (vista previa cambia, editor no), guardar, menú nativo actualizado, aplicar, cerrar con cambios sin guardar, en `tests/e2e/ui/themes-zoom.spec.ts` (eliminar el estilo activo ⇒ predeterminado queda cubierto por la lógica del catálogo, sin prueba de interfaz)
