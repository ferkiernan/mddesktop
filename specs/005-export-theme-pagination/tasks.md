---
description: "Tareas: estilo y paginación fiable al exportar"
---

# Tasks: Estilo y paginación fiable al exportar

**Tests**: incluidos; por indicación de la persona se escriben junto al código y se **ejecutan al terminar toda la codificación**.

## Phase 1: Foundational

- [X] T001 Preferencia `exportStyle` (default `"screen"`, saneada) en `src-tauri/src/services/app_data.rs`, `src/services/contracts.ts`, `src/features/settings/store.ts` y el fixture `tests/e2e/ui/support.ts`
- [X] T002 Opciones de estilo de exportación ("Como en pantalla" + estilos) y resolución de variables en `src/features/export/exportStyles.ts`
- [X] T003 `withViewer` con `styleVars` opcionales y `--mdw-content-zoom: 1` en `src/features/export/viewer.ts`; `buildExport` devuelve también páginas/HTML de vista previa en `src/features/export/exportDocument.ts`

## Phase 2: User Story 1 + 3 - Panel con estilo y vista previa idéntica (P1/P2)

- [X] T004 [US1] Panel modal `src/features/export/ExportPanel.tsx` (lista de estilos, vista previa, progreso, Cancelar/Exportar, Escape, foco, "Página X de N") y su host en `src/app/App.tsx`; estilos en `src/app/theme.css`
- [X] T005 [US1] Flujo `exportActiveDocument`: panel → bytes de la vista previa → diálogo nativo → escribir; recordar el estilo; avisos al final, en `src/features/export/exportDocument.ts`

## Phase 3: User Story 2 - Nada cortado (P1)

- [X] T006 [US2] Ajuste de anchos/altos y avisos de reducción en `src/features/export/fit.ts`, aplicado en `layoutPages` (`src/features/export/rasterize.ts`)
- [X] T007 [US2] Renglones como candidatos de corte y control de líneas sueltas en `collectBlocks` (`src/features/export/paginate.ts`)
- [X] T008 [US2] Tablas: filas como candidatas y encabezado repetido (paginate calcula; `rasterize.ts` dibuja el encabezado y reduce el alto útil)

## Phase 4: User Story 4 + pruebas (se ejecutan al final)

- [X] T009 [P] Vitest: `paginate` con renglones, líneas sueltas y encabezado de tabla; opciones de estilo, en `tests/unit/export-paginate.spec.ts`
- [X] T010 [P] Playwright: panel (estilo preseleccionado, cambiar estilo no toca el editor, Cancelar no escribe, Exportar escribe, recuerda estilo) en `tests/e2e/ui/export.spec.ts`
- [X] T011 [P] Nativa: documento largo (tabla de 120 filas, tabla ancha, diagrama alto, código de 200 líneas, párrafos largos) → sin cortes (muestreo de los bordes de página) y estilo elegido aplicado, en `tests/e2e/native/export-long.cdp.mjs` (estilo elegido: `tests/e2e/ui/export.spec.ts`)
- [X] T012 Documentar en `docs/export.md`

## Dependencies

T001–T003 → T004–T005; T006–T008 independientes del panel; T009–T011 se ejecutan cuando toda la codificación (incluidas 006, 008, 004, 007) termine.
