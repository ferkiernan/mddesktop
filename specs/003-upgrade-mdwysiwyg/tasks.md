---
description: "Tareas: actualizar mdwysiwyg a 0.8.0 y adaptar MD Desktop"
---

# Tasks: Actualizar el editor a su última versión

**Input**: `specs/003-upgrade-mdwysiwyg/` (plan, research, data-model, contracts, quickstart)

**Tests**: incluidos (constitución VII y FR-002: las expectativas existentes no cambian; las pruebas nuevas se escriben antes de implementar y deben fallar primero).

## Phase 1: Setup

- [X] T001 Cambiar `"mdwysiwyg"` a `"^0.8.0"` en `package.json`, ejecutar `npm install` (sin `--no-save` ni tarball) y verificar que `node_modules/mdwysiwyg/package.json` y `package-lock.json` indican 0.8.0
- [X] T002 Ejecutar línea base con el editor nuevo y sin otros cambios: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `cargo test` (en `src-tauri/`) y `npx playwright test`; anotar fallos en `specs/003-upgrade-mdwysiwyg/research.md` (sección "Línea base 0.8.0")

## Phase 2: Foundational

- [X] T003 Quitar el objeto sin tipos `upstream` y pasar `resolveImageSrc` como prop tipada en `src/features/editor/EditorAdapter.tsx`; usar los tipos `MarkdownEditorHandle`/`MarkdownEditorProps` de 0.8.0 en `src/features/editor/handles.ts` e `src/features/images/insertImage.ts` (eliminar comprobaciones de "capacidad existe" para 0.2.x)
- [X] T004 Revisar `src/features/editor/reloadUndo.ts` (R3): reemplazar la alternativa por `setMarkdown` del handle si es deshacible; mantener el archivo si la prueba nativa `tests/e2e/native/recovery.cdp.mjs` o `tests/unit/conflict.spec.ts` dejan de pasar

**Checkpoint**: compila con tipos de 0.8.0 y las suites de T002 pasan.

## Phase 3: User Story 1 - Versión publicada y build reproducible (P1) 🎯 MVP

**Goal**: instalación limpia ⇒ 0.8.0 con estilos. **Independent test**: `npm ci` + build + barra del editor con estilo.

- [X] T005 [US1] Ejecutar `rm -rf node_modules && npm ci` y confirmar versión 0.8.0 y que `node_modules/mdwysiwyg/dist/index.css` contiene `MarkdownEditor_root`; registrar en `docs/dependencies.md`
- [X] T006 [US1] Construir el exe de prueba con `node scripts/build-test-exe.mjs` y correr `node tests/e2e/native/styles.cdp.mjs "$TEMP/mddesktop-test.exe"` (barra con degradado e iconos en los 7 estilos)

## Phase 4: User Story 2 - Sin regresiones (P1)

**Goal**: 001/002 intactos. **Independent test**: todas las suites existentes pasan sin cambiar aserciones.

- [X] T007 [US2] Correr las pruebas nativas existentes con el exe de T006: `export.cdp.mjs`, `recovery.cdp.mjs`, `shortcuts.cdp.mjs`, `images.cdp.mjs`, `os-integration.cdp.mjs` en `tests/e2e/native/`; corregir el código de la app (no las aserciones) ante cualquier fallo
- [X] T008 [P] [US2] Verificar en `tests/e2e/ui/fidelity.spec.ts` que el Markdown producido para las mismas ediciones no cambia; si cambia, documentar la diferencia como cambio intencionado del editor en `docs/mdwysiwyg-limitations.md` y ajustar solo con justificación
- [X] T009 [P] [US2] Prueba nativa de exportación: comprobar que en las páginas no aparece el triángulo del menú de tabla (muestreo del área de la tabla) en `tests/e2e/native/export.cdp.mjs`

## Phase 5: User Story 3 - Estilos completos con las variables nuevas (P2)

**Goal**: los 7 estilos cubren las 20 variables de 0.5.0 y son legibles. **Independent test**: pruebas de contraste + capturas por estilo.

- [X] T010 [US3] Escribir primero (deben fallar) en `tests/unit/editor-styles.spec.ts`: `REQUIRED` con 39 variables y contraste ≥ 4,5:1 para código/`--mdw-code-block-bg`, enlaces/`--mdw-content-bg`, cita, popover y `--mdw-mermaid-bg`/`#333333`
- [X] T011 [US3] Añadir las 20 variables (R7) a los 7 estilos en `src/features/settings/editorStyles.ts` ("Default" con los valores por defecto del editor; los oscuros derivados de su paleta) hasta que pase T010
- [X] T012 [P] [US3] Ampliar `tests/e2e/native/styles.cdp.mjs` para abrir el menú de una celda de tabla y el diálogo de enlace por estilo y guardar capturas; revisar a ojo Dark y Winamp
- [X] T013 [P] [US3] Ampliar `tests/e2e/ui/styles.spec.ts`: el popover/menú del editor (montado en `body`) recibe `--mdw-popover-bg` del estilo activo

## Phase 6: User Story 4 - Comportamientos nuevos sin efectos colaterales (P2)

**Goal**: triángulo de tabla, menús tematizados y atajos conviven. **Independent test**: prueba UI de tabla.

- [X] T014 [US4] Nueva prueba en `tests/e2e/ui/editor-options.spec.ts`: hover + clic en el triángulo de una celda, cerrar sin elegir ⇒ sin "Cambios sin guardar"; con el menú abierto, Ctrl+S/Ctrl+W/Ctrl+O siguen funcionando
- [X] T015 [US4] Corregir en `src/features/editor/userEdit.ts` o `src/features/shortcuts/manager.ts` lo que T014 detecte (sin cambiar aserciones existentes)

## Phase 7: User Story 6 - Mostrar barra e Historial de versiones (P2)

**Goal**: dos preferencias nuevas persistidas y en menús. **Independent test**: alternar con cambios sin guardar y reiniciar.

- [X] T016 [P] [US6] Tests Rust primero en `src-tauri/src/services/app_data.rs`: defaults `editorToolbarVisible=true`, `editorHistory=true`, archivo viejo sin campos, valores inválidos
- [X] T017 [US6] Añadir `editor_toolbar_visible` y `editor_history` a `Preferences` (default + `sanitized`) en `src-tauri/src/services/app_data.rs`
- [X] T018 [P] [US6] Zod: campos en `Preferences` y `view.toggleToolbar`/`settings.toggleHistory` en `MenuAction` en `src/services/contracts.ts`; defaults en `src/features/settings/store.ts`
- [X] T019 [US6] Menú nativo: `CheckMenuItem` "Mostrar barra de herramientas" (Ver) e "Historial de versiones" (Configuración) en `src-tauri/src/services/menu.rs`; comando `set_view_menu({ toolbar, history })` en `src-tauri/src/commands/app.rs` registrado en `src-tauri/src/lib.rs` con validación de parámetros
- [X] T020 [US6] `toggleEditorToolbar()`/`toggleEditorHistory()` en `src/features/settings/appearance.ts`; casos en `src/app/menuBridge.ts`; llamada a `set_view_menu` al cargar y al cambiar preferencias en `src/features/settings/store.ts`; wrapper IPC en `src/services/ipc.ts`
- [X] T021 [US6] Pasar `showToolbar={prefs.editorToolbarVisible}` y `historyUndo={prefs.editorHistory}` en `src/features/editor/EditorAdapter.tsx` (el visor de `src/features/export/viewer.ts` no los recibe)
- [X] T022 [P] [US6] Tests unitarios en `tests/unit/shortcuts-appearance.spec.ts`: acciones de menú alternan y guardan; `set_view_menu` recibe el estado
- [X] T023 [US6] Ampliar `tests/e2e/ui/editor-options.spec.ts`: ocultar/mostrar barra 10 veces con cambios sin guardar ⇒ contenido, cursor y marcador intactos (SC-007); historial: abrir y cerrar sin confirmar ⇒ sin marcador; confirmar otra versión ⇒ marcador de modificado
- [X] T024 [US6] Prueba nativa `tests/e2e/native/editor-options.cdp.mjs`: alternar ambas opciones vía `settings_save`, recargar y comprobar persistencia y estado de la barra/reloj en la app real
- [X] T025 [P] [US6] Documentar en `README.md` ambas opciones y que el historial vive en memoria por editor (se pierde al cerrar la pestaña o al descartar el editor)

## Phase 8: User Story 5 - Rendimiento y tamaño (P3)

**Goal**: presupuestos mantenidos. **Independent test**: mediciones comparadas.

- [X] T026 [US5] Con el historial de versiones activado (predeterminado; hasta 200 versiones en memoria por editor) ejecutar `scripts/perf/measure.ps1` y `node scripts/perf/measure-ui.mjs`; registrar memoria con un documento, apertura de 100 KB y tamaños de exe/instalador junto a los anteriores en `docs/performance.md`; si se supera un umbral, abrir hallazgo y no cerrar la feature

## Phase 9: Polish & entrega

- [X] T027 [P] Actualizar `docs/mdwysiwyg-limitations.md` (retirar limitaciones resueltas: U1–U3, CSS Modules) y `docs/upstream-requests.md` (estado de cada solicitud; candidata: tema de Mermaid)
- [X] T028 [P] Actualizar `specs/003-upgrade-mdwysiwyg/research.md` con resultados (línea base, R3 decidido, mediciones)
- [X] T029 Correr el quickstart completo (`specs/003-upgrade-mdwysiwyg/quickstart.md`) y dejar todo en PASS
- [X] T030 `npm run tauri build`; si la app instalada no está abierta, copiar `src-tauri/target/release/mddesktop.exe` sobre `%LOCALAPPDATA%\MD Desktop\mddesktop.exe` y comparar hashes; informar ruta del instalador (FR-013)

## Dependencies & Execution Order

- Setup (T001–T002) → Foundational (T003–T004) → US1 → US2 (validan la base) → US3, US4, US6 (independientes entre sí) → US5 (mide el resultado final) → Polish.
- Dentro de US6: T016 → T017; T018 ∥ T017; T019 → T020 → T021 → T022/T023/T024.
- T010 antes de T011 (debe fallar primero).

## Parallel Examples

- US2: T008 y T009 en paralelo tras T007.
- US3: T012 y T013 en paralelo tras T011.
- US6: T016, T018 y T025 en paralelo al comienzo.
- Polish: T027 y T028 en paralelo.

## Implementation Strategy

- **MVP**: Phase 1–4 (versión publicada, tipos, sin regresiones). Ya entrega valor: instalación reproducible y editor con estilos.
- Luego US3 (estilos completos), US4, US6 (opciones nuevas) y por último US5 + entrega.
