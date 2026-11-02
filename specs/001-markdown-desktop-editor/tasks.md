---

description: "Lista de tareas para Markdown Desktop Editor"
---

# Tasks: Markdown Desktop Editor

**Input**: documentos de diseño en `/specs/001-markdown-desktop-editor/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: SÍ incluidos — el spec (§15) y la constitución (Principio VII) los exigen. Dentro de cada historia, las pruebas se escriben primero y deben fallar antes de implementar.

**Organization**: agrupadas por historia de usuario (US1…US7) para implementar y probar cada una de forma independiente.

## Format: `[ID] [P?] [Story] Descripción con ruta`

- **[P]**: paralelizable (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1…US7)
- Rutas relativas a la raíz del repositorio (estructura en [plan.md](plan.md))

---

## Phase 1: Setup

**Purpose**: entorno y esqueleto del proyecto

- [x] T001 Instalar Rust (rustup), Visual Studio Build Tools (C++) y verificar WebView2; registrar versiones en `docs/dev-setup.md` (ver quickstart.md §1)
- [x] T002 Crear el proyecto Tauri 2 + React 18.3 + TypeScript + Vite en la raíz (`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src-tauri/`)
- [x] T003 Agregar dependencias: `zustand`, `zod`, `mdwysiwyg` en `package.json`; en `src-tauri/Cargo.toml`: `tauri-plugin-dialog`, `tauri-plugin-single-instance`, `tauri-plugin-window-state`, `serde`, `serde_json`, `notify`, `notify-debouncer-mini`, `encoding_rs`, `chardetng`, `xxhash-rust`, `thiserror`, `uuid`
- [x] T004 Crear el esqueleto de carpetas de plan.md (`src/app`, `src/features/{documents,tabs,editor,session,settings,shortcuts,images}`, `src/services`, `src/ui`, `src-tauri/src/{commands,services,platform}`, `tests/{unit,components,e2e,fixtures}`, `scripts/perf`, `docs`)
- [x] T005 [P] Configurar ESLint + Prettier (`eslint.config.js`, `.prettierrc`) y `rustfmt.toml` + clippy en `src-tauri/`
- [x] T006 [P] Configurar Vitest + React Testing Library en `vitest.config.ts` y `tests/setup.ts`
- [x] T007 [P] Configurar Playwright (capas `ui` y `native`) en `playwright.config.ts`
- [x] T008 [P] Actualizar `.gitignore` (`node_modules`, `dist`, `src-tauri/target`, `test-results`, `playwright-report`)
- [x] T009 [P] Crear CI en `.github/workflows/ci.yml` (windows-latest: lint, Vitest, `cargo test`, `tauri build`)

---

## Phase 2: Foundational (bloquea todas las historias)

**Purpose**: servicios Rust base, capa de servicios del frontend y spikes que validan supuestos de plataforma

**⚠️ CRITICAL**: ninguna historia comienza hasta cerrar esta fase (incluida la puerta T031)

### Núcleo Rust

- [x] T010 `AppError` con códigos de data-model.md y serialización a `{code,message,details}` en `src-tauri/src/error.rs`
- [x] T011 [P] `AppState` (rutas autorizadas, watcher, última huella propia por ruta) en `src-tauri/src/state.rs`
- [x] T012 [P] `AuthorizedPaths` con canonicalización, rechazo de `..` y extensiones no `.md`/`.markdown`, más tests unitarios en `src-tauri/src/services/authz.rs`
- [x] T013 [P] Módulo de codificación: BOM, UTF-8 estricto, detección con `chardetng`, detección/normalización de EOL y reaplicación de EOL/BOM, con tests en `src-tauri/src/services/encoding.rs`
- [x] T014 [P] `FileFingerprint` (`mtimeMs`, `size`, hash xxh3) y `stat` en `src-tauri/src/services/fs_service.rs`
- [x] T015 Lectura de documento y escritura atómica (temp en el mismo directorio → `sync_all` → `rename`; omitir si bytes idénticos; `EXTERNAL_CONFLICT`, `ENCODING_CONVERSION_REQUIRED`) en `src-tauri/src/services/fs_service.rs`, con tests de integración en `src-tauri/tests/fs_service.rs` incluyendo fallo simulado a mitad de escritura (SC-006)
- [x] T016 Persistencia JSON atómica con manejo de archivo corrupto (`*.corrupt-<ts>`) en `src-tauri/src/services/persistence.rs`, con tests en `src-tauri/tests/persistence.rs`
- [x] T017 Builder de Tauri: `single-instance` registrado primero, `window-state`, `dialog`, estado y registro de comandos en `src-tauri/src/lib.rs`; CSP estricta y ventana en `src-tauri/tauri.conf.json`; permisos mínimos en `src-tauri/capabilities/default.json`

### Capa de servicios del frontend

- [x] T018 [P] Esquemas Zod de todos los tipos y comandos de contracts/ en `src/services/contracts.ts`
- [x] T019 [P] Mapeo de `AppError` a errores de UI en `src/services/errors.ts`
- [x] T020 Wrappers tipados de `invoke` con validación Zod en `src/services/ipc.ts` (depende de T018, T019)
- [x] T021 [P] Suscripciones tipadas a eventos de ipc-events.md en `src/services/events.ts`
- [x] T022 [P] Helper `mockIpc` (`@tauri-apps/api/mocks`) y fixtures JSON compartidos en `tests/helpers/mockIpc.ts` y `tests/fixtures/ipc/`; corpus Markdown (LF, CRLF, BOM, Windows-1252, grande) en `tests/fixtures/markdown/`
- [x] T023 Application Shell: layout (menú nativo, zona de pestañas, editor, barra de estado), proveedores, error boundary y variables CSS de tema en `src/app/App.tsx` y `src/app/theme.css`

### Spikes (resultados en docs/spikes.md)

- [x] T024 [P] Script de medición (arranque en frío, RSS de proceso + WebView2 en reposo, tiempos de cambio de pestaña y apertura) en `scripts/perf/measure.ps1`
- [x] T025 S1: montar `mdwysiwyg` con carga perezosa en el shell y medir RAM/arranque con 1, 3 y 5 editores montados; fijar tamaño del pool y confirmar umbral de 5 MB (`src/features/editor/lazy.ts`, `docs/spikes.md`)
- [ ] T026 [P] S2: prueba de fidelidad — abrir/serializar el corpus sin editar (bytes idénticos) y tras ediciones típicas, listando transformaciones, en `tests/unit/fidelity.spec.ts` y `docs/spikes.md`
- [ ] T027 [P] S3: probar en un build real `single-instance` (argumentos desde el Explorador) y `fileAssociations` mínimo en `src-tauri/tauri.conf.json`; documentar cómo llegan los argumentos en Windows
- [ ] T028 [P] S4: prototipo de menú Edición nativo (Deshacer/Rehacer/Cortar/Copiar/Pegar/Seleccionar todo sin acelerador) sobre el editor; decidir menú nativo vs HTML en `docs/spikes.md`
- [x] T029 [P] S5: ejecutar Playwright contra el WebView2 real vía CDP (`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`) con una prueba mínima en `tests/e2e/native/smoke.spec.ts`; alternativa `tauri-driver`
- [ ] T030 [P] S6: probar reordenado por Pointer Events y comprobar si el DnD HTML5 interno funciona con el arrastre de archivos activo, en `tests/e2e/ui/dnd-spike.spec.ts`
- [x] T031 Puerta de calidad: consolidar S1–S6 en `docs/spikes.md` con decisión explícita (pool, menú, E2E, DnD); si S1 incumple el presupuesto de RAM, detener y decidir antes de continuar — resuelta: S1 medido (ver docs/spikes.md); S2–S6 pasan a sus historias
- [ ] T032 [P] Registrar en `docs/upstream-requests.md` y abrir issues en `ferkiernan/mdwysiwyg` para U1 (`setMarkdown` deshacible), U2 (`insertMarkdown`), U3 (`resolveImageSrc`) y U4 (estado de vista) con los contratos de editor-adapter.md

**Checkpoint**: base lista; las historias pueden empezar.

---

## Phase 3: User Story 1 — Editar un documento Markdown local (P1) 🎯 MVP

**Goal**: abrir/crear, editar visualmente y guardar archivos `.md` sin pérdida de datos.

**Independent Test**: abrir un `.md` con el diálogo nativo, editarlo y guardar; el archivo en disco queda actualizado (UTF-8/EOL preservados). Duplicados detectados.

### Tests (escribir primero, deben fallar)

- [x] T033 [P] [US1] Tests de comandos de documentos (CRLF→LF, `TOO_LARGE`, `ENCODING_UNDETECTABLE`, conflicto, conversión de codificación, no-op) en `src-tauri/tests/documents_commands.rs`
- [x] T034 [P] [US1] Tests del store (nuevo, abrir con deduplicación por ruta, `isDirty` derivado, guardar actualiza `savedContent`, Guardar como sobre ruta abierta) en `tests/unit/documents-store.spec.ts`
- [ ] T035 [P] [US1] Test de contrato del adaptador (montaje, `onChange`, alternar vistas sin disparar cambios) en `tests/components/editor-adapter.spec.tsx`
- [ ] T036 [P] [US1] E2E de UI abrir → editar → guardar y Guardar como de documento nuevo en `tests/e2e/ui/open-edit-save.spec.ts`

### Implementación

- [x] T037 [US1] Servicio de diálogos nativos (abrir multi-archivo, guardar como; autorizan rutas; arrancan en `lastDirectory`) en `src-tauri/src/services/dialog_service.rs`
- [x] T038 [US1] Comandos `pick_open_files`, `read_document`, `pick_save_path`, `write_document`, `stat_document` según ipc-commands.md en `src-tauri/src/commands/documents.rs`
- [x] T039 [US1] Menú nativo Archivo (Nuevo, Abrir, Guardar, Guardar como, Cerrar documento, Cerrar todos, Salir) con aceleradores de aplicación y evento `menu://action` en `src-tauri/src/services/menu.rs`
- [x] T040 [P] [US1] Tipos `EditorDocument`, `FileFingerprint` y derivados en `src/features/documents/types.ts`
- [x] T041 [US1] Store Zustand de documentos (id, ruta única, contenido, `savedContent`, huella, EOL/BOM/codificación) en `src/features/documents/store.ts`
- [x] T042 [US1] Acciones nuevo/abrir/guardar/guardar como (guardar sin ruta → Guardar como; confirmar conversión de codificación; manejo de `TOO_LARGE` y errores) en `src/features/documents/actions.ts`
- [x] T043 [P] [US1] `EditorAdapter` (instancia única, normaliza a `\n`, detecta capacidades U1/U2) y cargador perezoso en `src/features/editor/EditorAdapter.tsx` y `src/features/editor/lazy.ts`
- [x] T044 [US1] `EditorHost` que conecta documento activo ↔ adaptador ↔ store en `src/features/editor/EditorHost.tsx`
- [x] T045 [P] [US1] Barra de estado (nombre, ruta, estado de cambios) y toast de confirmación de guardado en `src/ui/StatusBar.tsx` y `src/ui/Toast.tsx`
- [x] T046 [P] [US1] Diálogos de aviso de archivo grande, error de codificación y error de guardado en `src/ui/Dialogs.tsx`
- [x] T047 [US1] Puente `menu://action` → acciones de documentos en `src/app/menuBridge.ts`

**Checkpoint**: US1 funcional y probada de forma independiente (MVP).

---

## Phase 4: User Story 2 — Varios documentos en pestañas (P1)

**Goal**: múltiples documentos con pestañas independientes que conservan su estado de edición.

**Independent Test**: abrir 3 documentos, editarlos, alternar y reordenar; contenido en todos y cursor/scroll/undo en los recientes (pool).

### Tests

- [x] T048 [P] [US2] Tests del reordenado y de cerrar otras/todas (lógica pura) en `tests/unit/tabs-store.spec.ts`
- [x] T049 [P] [US2] Tests del pool LRU (montar, ocultar, expulsar, remontar con contenido actual) en `tests/unit/editor-pool.spec.ts`
- [ ] T050 [P] [US2] Tests RTL de la barra de pestañas (nombre, indicador de cambios, cierre, activa, nueva) en `tests/components/tabbar.spec.tsx`
- [ ] T051 [P] [US2] E2E de UI: abrir 3, alternar, reordenar, cerrar otras en `tests/e2e/ui/tabs.spec.ts`

### Implementación

- [x] T052 [US2] Slice de pestañas (orden, activa, mover, siguiente/anterior, cerrar otras/todas) en `src/features/tabs/store.ts`
- [x] T053 [P] [US2] Componentes `TabBar` y `Tab` en `src/features/tabs/TabBar.tsx` y `src/features/tabs/Tab.tsx`
- [x] T054 [US2] Hook de reordenado con Pointer Events (según decisión de S6) en `src/features/tabs/usePointerReorder.ts`
- [x] T055 [P] [US2] Menú contextual de pestaña (Cerrar, Cerrar otras, Cerrar todas) en `src/features/tabs/TabContextMenu.tsx`
- [x] T056 [US2] Pool LRU de editores montados (tamaño desde preferencias, ocultar con `display:none`, expulsar y remontar) en `src/features/editor/pool.ts` y `src/features/editor/EditorPool.tsx`
- [x] T057 [US2] Reemplazar `EditorHost` de instancia única por `EditorPool` y mantener la activa en foco en `src/features/editor/EditorHost.tsx`
- [x] T058 [US2] Botón de nueva pestaña y acciones siguiente/anterior en `src/features/tabs/TabBar.tsx` y `src/app/menuBridge.ts`

**Checkpoint**: US1 + US2 funcionan juntas.

---

## Phase 5: User Story 3 — No perder cambios (P1)

**Goal**: confirmar antes de cerrar con pendientes y resolver conflictos por modificación externa con las 3 opciones.

**Independent Test**: modificar y cerrar (Guardar/Descartar/Cancelar); alterar el archivo desde fuera y resolver el conflicto; Ctrl+Z tras recargar.

### Tests

- [x] T059 [P] [US3] Test Rust del watcher (modificado, eliminado, renombrado, debounce, ignorar escritura propia) en `src-tauri/tests/watcher.rs`
- [x] T060 [P] [US3] Tests del flujo de cierre (pestaña, todas, salir; Cancelar aborta) en `tests/unit/close-flow.spec.ts`
- [x] T061 [P] [US3] Tests de resolución de conflicto (pisar, abrir en pestaña nueva sin ruta, recargar aquí; Ctrl+Z restaura) en `tests/unit/conflict.spec.ts`
- [ ] T062 [P] [US3] E2E de UI de cierre con pendientes y de conflicto en `tests/e2e/ui/data-protection.spec.ts`

### Implementación

- [x] T063 [US3] Observador de archivos con `notify` + debounce (~300 ms), solo archivos abiertos, en `src-tauri/src/services/watcher.rs`
- [x] T064 [US3] Comando `watch_documents` y emisión de `fs://external-change` (ignora huella de escritura propia) en `src-tauri/src/commands/documents.rs`
- [x] T065 [US3] Ciclo de vida: interceptar cierre de ventana, emitir `app://close-requested`, comando `confirm_exit` en `src-tauri/src/services/lifecycle.rs` y `src-tauri/src/commands/app.rs`
- [x] T066 [US3] Flujo de cierre con pendientes (pestaña, otras, todas, salir) en `src/features/documents/closeFlow.ts`
- [x] T067 [P] [US3] `ConfirmCloseDialog` (Guardar/Descartar/Cancelar) en `src/ui/ConfirmCloseDialog.tsx`
- [x] T068 [US3] Manejo de `externalState` en el store y re-chequeo de huella al recuperar el foco y antes de guardar en `src/features/documents/externalChanges.ts`
- [x] T069 [P] [US3] `ConflictDialog` con las 3 opciones en `src/ui/ConflictDialog.tsx`
- [x] T070 [US3] Acciones de conflicto: pisar (`overwriteExternal`), abrir versión del disco en pestaña nueva sin ruta, recargar en la pestaña actual en `src/features/documents/conflictActions.ts`
- [x] T071 [US3] Recarga deshacible: usar `setMarkdown` (U1) si el handle lo expone; si no, `reloadSnapshot` + captura de Ctrl+Z solo mientras esté activo, en `src/features/editor/EditorAdapter.tsx` y `src/features/editor/reloadUndo.ts`
- [x] T072 [US3] Archivo eliminado/renombrado externamente: aviso y Guardar/Guardar como que recrea el archivo en `src/features/documents/externalChanges.ts`

**Checkpoint**: las tres historias P1 completas (producto utilizable).

---

## Phase 6: User Story 4 — Recuperar sesión (P2)

**Goal**: restaurar pestañas/preferencias y recuperar contenido no guardado tras cierre inesperado.

**Independent Test**: editar sin guardar, matar el proceso, relanzar; se ofrece recuperar y el archivo original no cambió.

### Tests

- [x] T073 [P] [US4] Tests Rust de sesión/recuperación/ajustes (válidos, ausentes, corruptos, rangos) en `src-tauri/tests/session_commands.rs`
- [x] T074 [P] [US4] Tests del escritor de recuperación (debounce ~4 s, al cambiar de pestaña, sin timers sin cambios) en `tests/unit/recovery.spec.ts`
- [x] T075 [P] [US4] Tests de restauración (huella distinta → `externalState`, huérfanos) en `tests/unit/session-restore.spec.ts`
- [x] T076 [P] [US4] E2E nativo: terminar proceso y relanzar en `tests/e2e/native/recovery.spec.ts`

### Implementación

- [x] T077 [US4] Comandos `session_load/save`, `recovery_write/list/delete`, `settings_load/save` en `src-tauri/src/commands/session.rs` y `src-tauri/src/commands/settings.rs`
- [x] T078 [US4] Session Manager (guardar sesión al abrir/cerrar/reordenar/activar con debounce corto) en `src/features/session/sessionManager.ts`
- [x] T079 [US4] Escritor de recuperación con debounce ~4 s y al cambiar de pestaña en `src/features/session/recoveryWriter.ts`
- [x] T080 [US4] Flujo de arranque: restaurar pestañas, activa y recuperación en `src/features/session/restore.ts`; diálogo de recuperación en `src/ui/RecoveryDialog.tsx`
- [x] T081 [P] [US4] Settings Manager y store (tema, zoom, barra de estado, último directorio, pool, umbral) en `src/features/settings/store.ts`
- [x] T082 [US4] Persistir tamaño/posición de ventana con `window-state` en `src-tauri/src/lib.rs`
- [x] T083 [US4] Limpiar `recovery/*` al guardar, descartar o cerrar sin guardar en `src/features/session/recoveryWriter.ts`

---

## Phase 7: User Story 5 — Abrir desde el sistema operativo (P2)

**Goal**: asociación de archivos, instancia única, argumentos y arrastre.

**Independent Test**: doble clic en `.md` con la app cerrada y abierta; arrastrar `.md` y `.txt`.

### Tests

- [x] T084 [P] [US5] Tests Rust de filtrado/autorización de rutas de argv, segunda instancia y arrastre en `src-tauri/tests/lifecycle.rs`
- [ ] T085 [P] [US5] Tests del manejador `app://open-files` (sin duplicados, rechazados) en `tests/unit/open-files.spec.ts`
- [x] T086 [P] [US5] E2E nativo de segunda instancia y arrastre en `tests/e2e/native/os-integration.spec.ts`

### Implementación

- [x] T087 [US5] `single-instance`: enfocar ventana y emitir `app://open-files` (`second-instance`) en `src-tauri/src/services/lifecycle.rs`
- [x] T088 [US5] Archivos por argumentos al arrancar (`get_launch_files`, `app://open-files` `argv`) en `src-tauri/src/services/lifecycle.rs` y `src-tauri/src/commands/app.rs`
- [x] T089 [US5] Arrastre de archivos manejado en Rust (`DragDrop`), filtrar `.md/.markdown`, autorizar y emitir `app://open-files`/`app://rejected-files` en `src-tauri/src/services/lifecycle.rs`
- [x] T090 [US5] `fileAssociations` para `.md` y `.markdown` y bundle NSIS (`embedBootstrapper`) en `src-tauri/tauri.conf.json`
- [x] T091 [US5] Manejador frontend de `app://open-files` y aviso de rechazados en `src/features/documents/openFilesHandler.ts`
- [ ] T092 [P] [US5] Código específico de plataforma aislado en `src-tauri/src/platform/windows.rs` (y `mod.rs`)

---

## Phase 8: User Story 6 — Menús, atajos y apariencia (P2)

**Goal**: menús completos, atajos documentados sin conflictos, tema, zoom y barra de estado.

**Independent Test**: ejecutar cada acción/atajo del spec; alternar tema y reiniciar.

### Tests

- [x] T093 [P] [US6] Tests del Keyboard Shortcut Manager (mapa Ctrl/Cmd, no interceptar Ctrl+Z/Y con foco en el editor) en `tests/unit/shortcuts.spec.ts`
- [x] T094 [P] [US6] Tests de tema, zoom y barra de estado con persistencia en `tests/unit/appearance.spec.ts`
- [x] T095 [P] [US6] E2E de UI de atajos y menús en `tests/e2e/ui/shortcuts-menus.spec.ts`

### Implementación

- [x] T096 [US6] Menús Edición y Ver (según decisión de S4) en `src-tauri/src/services/menu.rs`
- [x] T097 [US6] Keyboard Shortcut Manager (Ctrl+N/O/S/Shift+S/W, Ctrl+Tab, Ctrl+Shift+Tab; Cmd en macOS) en `src/features/shortcuts/manager.ts`
- [x] T098 [US6] Comandos de Edición hacia el editor activo (cortar/copiar/pegar/seleccionar todo/deshacer/rehacer) en `src/features/editor/editCommands.ts`
- [x] T099 [P] [US6] Tema claro/oscuro con variables `--mdw-*` y persistencia en `src/features/settings/theme.ts`
- [x] T100 [P] [US6] Zoom de interfaz (0.7–2.0) en `src/features/settings/zoom.ts`
- [x] T101 [US6] Mostrar/ocultar barra de estado en `src/ui/StatusBar.tsx` y `src/features/settings/store.ts`

---

## Phase 9: User Story 7 — Imágenes locales portables (P3)

**Goal**: insertar imágenes, copiarlas a `assets/` y referenciarlas con ruta relativa.

**Independent Test**: insertar imagen en documento guardado, aceptar copia a `assets/`, mover la carpeta; la imagen sigue visible.

**Dependencia externa**: `mdwysiwyg` con U2 y U3 (T032). Sin ellas, esta fase se difiere sin bloquear el release.

### Tests

- [ ] T102 [P] [US7] Tests Rust de `import_image` (copia, ruta relativa con `/`, homónimo sin sobrescribir, `resolve_image_url` acotado al directorio) en `src-tauri/tests/images.rs`
- [ ] T103 [P] [US7] Tests del flujo de imagen (documento sin ruta → Guardar como primero; cancelar no inserta) en `tests/unit/images.spec.ts`
- [ ] T104 [P] [US7] E2E de inserción y portabilidad en `tests/e2e/native/images.spec.ts`

### Implementación

- [ ] T105 [US7] Comandos `pick_image`, `import_image`, `resolve_image_url` en `src-tauri/src/commands/images.rs`
- [ ] T106 [US7] Alcance del protocolo `asset:` limitado al directorio del documento en `src-tauri/tauri.conf.json` y `src-tauri/capabilities/default.json`
- [ ] T107 [US7] Flujo "Insertar imagen…" (guardar primero, diálogo, copia a `assets/`, confirmar sobrescritura) en `src/features/images/insertImage.ts`
- [ ] T108 [US7] Integrar `insertMarkdown` (U2) y `resolveImageSrc` (U3) en `src/features/editor/EditorAdapter.tsx`
- [ ] T109 [US7] Acción de menú "Insertar imagen…" en `src-tauri/src/services/menu.rs` y `src/app/menuBridge.ts`

---

## Phase 10: Polish y transversales

- [ ] T110 [P] Medir y documentar SC-001…SC-003 en equipo de referencia con `scripts/perf/measure.ps1` → `docs/performance.md`
- [ ] T111 [P] Revisión de seguridad: permisos mínimos de `capabilities/default.json`, CSP, ausencia de `plugin-fs` en el frontend y de ejecución de procesos, en `docs/security-review.md`
- [ ] T112 [P] Documentar limitaciones de `mdwysiwyg` (normalización, historial por pestaña, pool) en `docs/mdwysiwyg-limitations.md` y `README.md`
- [ ] T113 [P] Accesibilidad básica de menú, pestañas y diálogos (roles ARIA, foco, teclado) en `src/ui/` y `src/features/tabs/`
- [ ] T114 Revisar dependencias (justificación y tamaño) y eliminar las no usadas en `package.json` y `src-tauri/Cargo.toml` (Principio I/IX)
- [ ] T115 Suite E2E completa (UI + nativa) pasando en CI en `.github/workflows/ci.yml`
- [ ] T116 `npm run tauri build`: generar instalador NSIS y validar V1–V15 de quickstart.md en una máquina sin Node/Rust (SC-009, SC-010)
- [ ] T117 Actualizar `specs/001-markdown-desktop-editor/spec.md` y `plan.md` con los resultados de spikes y mediciones; cerrar ítems pendientes de Assumptions (umbral de tamaño, codificaciones soportadas)

---

## Dependencies & Execution Order

### Orden de fases

- **Setup (1)** → **Foundational (2)** → historias → **Polish (10)**.
- La puerta **T031** (spikes) bloquea el inicio de las historias; T025 (S1) puede cambiar el diseño del pool.
- **US1 (3)** no depende de otras historias. **US2 (4)** extiende el store/editor de US1. **US3 (5)** depende de US1 (guardar) y usa pestañas de US2 para el flujo de cierre múltiple. **US4 (6)** depende de US1–US2 (documentos/pestañas). **US5 (7)** depende de US1 (abrir) y T027 (S3). **US6 (8)** depende de US1 (menú) y T028 (S4). **US7 (9)** depende de US1 y de U2/U3 upstream (T032).
- Prioridad: P1 (US1→US2→US3), P2 (US4, US5, US6 en cualquier orden), P3 (US7).

### Dentro de cada historia

- Pruebas primero (deben fallar) → servicios/comandos Rust → store/acciones → UI → integración.
- Contratos de [contracts/](contracts/) antes de comandos y esquemas Zod.

### Oportunidades de paralelismo

- Setup: T005–T009.
- Foundational: T011–T014; T018, T019, T021, T022; spikes T026–T030 y T032 tras el scaffold.
- Cada historia: todas sus tareas de prueba [P]; tareas de UI en archivos distintos.
- US4, US5 y US6 pueden avanzar en paralelo con equipos distintos tras US3 (comparten `menu.rs`/`menuBridge.ts`: coordinar T039/T096/T109).

### Ejemplo de paralelismo (US1)

```text
Pruebas:  T033  T034  T035  T036
Impl:     T037→T038   |   T040 → T041 → T042   |   T043 (adaptador)   |   T045  T046
```

## Implementation Strategy

1. **MVP**: Fases 1–3 (US1) → validar V1–V3, V13.
2. **Producto utilizable**: añadir US2 y US3 (todo P1) → validar V4–V6.
3. **Completar P2**: US4, US5, US6 → V7–V10.
4. **P3**: US7 cuando `mdwysiwyg` publique U2/U3.
5. **Release**: Fase 10 con mediciones, revisión de seguridad e instalador probado en equipo limpio.

## Notes

- `[P]` = archivos distintos y sin dependencias pendientes.
- Commits por tarea o grupo lógico; verificar que las pruebas fallan antes de implementar.
- Cualquier tarea que toque IPC actualiza `contracts/` y los esquemas Zod/serde en el mismo cambio.
- Si un spike contradice el plan, actualizar plan.md/research.md antes de seguir.
