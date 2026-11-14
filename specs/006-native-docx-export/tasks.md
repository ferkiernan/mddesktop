---
description: "Tareas: exportación a Word/ODT con contenido editable"
---

# Tasks: Exportación a Word con contenido editable

**Tests**: se escriben con el código y se ejecutan al terminar toda la codificación (indicación de la persona).

## Phase 1: Foundational

- [X] T001 Colores, contraste y fuentes comunes en `src/features/export/native/color.ts`
- [X] T002 Modelo estructurado desde el visor (bloques, runs, tema, imágenes y Mermaid a PNG, avisos) en `src/features/export/native/model.ts`

## Phase 2: User Stories 1–4 (Word)

- [X] T003 [US1] [US2] [US3] [US4] Escritor DOCX nativo (estilos de encabezado, numeración, tablas con encabezado repetido y filas sin partir, imágenes, hipervínculos, código coloreado, citas, separadores, fondo de página en estilos oscuros) en `src/features/export/native/docx.ts`

## Phase 3: User Story 5 (OpenDocument)

- [X] T004 [US5] Escritor ODT nativo equivalente en `src/features/export/native/odt.ts`

## Phase 4: Integración

- [X] T005 Entrada `buildNativeDocument` en `src/features/export/native/build.ts` y uso desde `src/features/export/exportDocument.ts` (avisos de conversión)
- [X] T006 Documentar en `docs/export.md`

## Phase 5: Pruebas (al final)

- [X] T007 [P] Vitest del modelo y de ambos escritores en `tests/unit/export-native.spec.ts`
- [X] T008 [P] Nativa: estructura y texto extraído en `tests/e2e/native/export.cdp.mjs`
