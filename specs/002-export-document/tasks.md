---

description: "Lista de tareas para Exportar documento"
---

# Tasks: Exportar documento

**Input**: documentos de diseño en `/specs/002-export-document/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: incluidos (constitución VII). Escribir primero las pruebas de cada historia.

## Format: `[ID] [P?] [Story] Descripción con ruta`

---

## Phase 1: Setup

- [ ] T001 Crear el documento de prueba con encabezados, énfasis, listas, tareas, tabla, código, imagen local y gráfico Mermaid en `tests/fixtures/markdown/export-sample.md`
- [ ] T002 [P] Constantes A4 (794×1123 px, margen 57 px, escala 2×, EMU) en `src/features/export/constants.ts`
- [ ] T003 [P] Script que compila un exe de depuración con identificador `com.ferkiernan.mddesktop.dev` (no choca con la app instalada) en `scripts/build-test-exe.mjs`

## Phase 2: Foundational (bloquea las historias)

- [ ] T004 [P] Rutas de exportación autorizadas (extensiones `html/pdf/docx/odt`, consumo único) con tests en `src-tauri/src/services/authz.rs`
- [ ] T005 Comandos `pick_export_path` y `write_export` (base64, límite 256 MiB, escritura atómica) con tests de la lógica pura; dependencia `base64`; registro en `src-tauri/src/commands/exports.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`
- [ ] T006 [P] Wrappers tipados `exports.pickPath` / `exports.write` y esquemas Zod en `src/services/ipc.ts` y `src/services/contracts.ts`
- [ ] T007 Submenú Archivo → Exportar (Página web, PDF, Word, OpenDocument), ids `export.*` en `src-tauri/src/services/menu.rs`, `src/services/contracts.ts` y despacho en `src/app/menuBridge.ts` (importación dinámica)
- [ ] T008 Visor fuera de pantalla: monta `mdwysiwyg` de solo lectura con el contenido y el estilo vigentes, espera Mermaid/imágenes y se destruye, en `src/features/export/viewer.ts`
- [ ] T009 Instantánea autocontenida (estilos computados en línea, SVG intacto, imágenes `data:`, casillas, bloques medidos, advertencias) en `src/features/export/snapshot.ts`

## Phase 3: User Story 1 — Página web autocontenida (P1) 🎯 MVP

**Independent Test**: exportar el documento de prueba a HTML y abrirlo sin red: aspecto del visor, A4, 0 recursos externos.

- [ ] T010 [P] [US1] Tests de instantánea (estilos en línea, imagen `data:`, casilla marcada, SVG conservado, sin `asset:`) en `tests/unit/export-snapshot.spec.ts`
- [ ] T011 [P] [US1] Tests de la página HTML (A4 210 mm, título, fondo del estilo, 0 recursos externos, enlaces conservados) en `tests/unit/export-html.spec.ts`
- [ ] T012 [US1] Envoltorio HTML autocontenido A4 en `src/features/export/htmlPage.ts`
- [ ] T013 [US1] Orquestación `exportDocument(format)`: capturar contenido → ruta → renderizar → bytes → escribir; formato `html` en `src/features/export/exportDocument.ts`

## Phase 4: User Story 2 — PDF fiel al visualizador (P1)

**Independent Test**: exportar a PDF: páginas A4, estilos, sin bloques partidos.

- [ ] T014 [P] [US2] Tests de paginación (corte en límites de bloque, bloque más alto que la página, documento vacío) en `tests/unit/export-paginate.spec.ts`
- [ ] T015 [P] [US2] Tests del PDF (cabecera, páginas 595.28×841.89, xref con desplazamientos exactos, `%%EOF`) en `tests/unit/export-pdf.spec.ts`
- [ ] T016 [US2] Paginación A4 en límites de bloque en `src/features/export/paginate.ts`
- [ ] T017 [US2] Rasterizado de páginas (SVG `foreignObject` → canvas 2× → JPEG), cediendo el hilo entre páginas, en `src/features/export/rasterize.ts`
- [ ] T018 [US2] Escritor PDF de imágenes A4 en `src/features/export/pdf.ts`
- [ ] T019 [US2] Formato `pdf` en `src/features/export/exportDocument.ts`

## Phase 5: User Story 3 — Word y OpenDocument (P2)

**Independent Test**: exportar a `.docx` y `.odt`: estructura válida y páginas A4.

- [ ] T020 [P] [US3] Tests ZIP (CRC-32, cabeceras, directorio central, lectura de vuelta) en `tests/unit/export-zip.spec.ts`
- [ ] T021 [P] [US3] Tests DOCX (partes, relaciones, XML bien formado, una página por imagen, A4, anclaje) en `tests/unit/export-docx.spec.ts`
- [ ] T022 [P] [US3] Tests ODT (`mimetype` primero y sin comprimir, manifiesto, XML bien formado, A4, marcos anclados) en `tests/unit/export-odt.spec.ts`
- [ ] T023 [US3] Escritor ZIP sin compresión con CRC-32 en `src/features/export/zip.ts`
- [ ] T024 [P] [US3] Escritor DOCX en `src/features/export/docx.ts`
- [ ] T025 [P] [US3] Escritor ODT en `src/features/export/odt.ts`
- [ ] T026 [US3] Formatos `docx` y `odt` en `src/features/export/exportDocument.ts`

## Phase 6: User Story 4 — Progreso, resultado y errores (P2)

**Independent Test**: documento largo con progreso; cancelar sin error; fallo de escritura sin archivo parcial.

- [ ] T027 [P] [US4] Tests del flujo con IPC simulado (cancelar → sin escritura ni error, progreso por páginas, error de escritura informado, imágenes omitidas como aviso, sin documento abierto) en `tests/unit/export-flow.spec.ts`
- [ ] T028 [US4] Progreso ("Preparando", "Página n de N", "Guardando"), resultado con ruta, mensajes de error y avisos (imágenes omitidas) en `src/features/export/exportDocument.ts` y `src/ui/Toast.tsx`
- [ ] T029 [US4] Exportar sin documento abierto: aviso sin error en `src/app/menuBridge.ts`

## Phase 7: Pulido y verificación

- [ ] T030 [P] Prueba Playwright de UI del menú → exportación con IPC simulado en `tests/e2e/ui/export.spec.ts`
- [ ] T031 Prueba nativa CDP: 4 formatos sobre la app real (firmas, A4, HTML sin referencias externas, `.md` intacto) en `tests/e2e/native/export.cdp.mjs`
- [ ] T032 [P] Documentar el formato, límites (texto no seleccionable en PDF/Word/ODT) y verificación manual en `README.md` y `docs/export.md`
- [ ] T033 Ejecutar la suite completa, actualizar la app instalada y marcar tareas

## Dependencias y orden

Setup → Foundational → US1 (MVP) → US2 → US3 → US4 → Pulido. US2 y US3 reutilizan el visor, la instantánea y el rasterizado; US3 depende del rasterizado de US2. Las tareas [P] de pruebas se escriben antes de la implementación de su historia.
