# Implementation Plan: Actualizar el editor a su última versión

**Branch**: `003-upgrade-mdwysiwyg` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-upgrade-mdwysiwyg/spec.md`

## Summary

Pasar `mdwysiwyg` de la copia local 0.3.1 a la **0.8.0 publicada** (`^0.8.0`, bloqueada en `package-lock.json`), tipar la API de host que hoy se pasa sin tipos, completar los 7 estilos con las 20 variables de color de 0.5.0 (con la regla de contraste del fondo Mermaid ya protegida por prueba), exponer dos preferencias nuevas (**Mostrar barra de herramientas** en Ver, **Historial de versiones** en Configuración) como `CheckMenuItem` nativos persistidos en `settings.json`, y verificar sin cambiar expectativas que 001/002 siguen funcionando (unitarias, UI, nativas, rendimiento). Termina con instalador regenerado y app instalada actualizada.

## Technical Context

**Language/Version**: TypeScript 5.9 strict + React 18.3 (frontend); Rust estable (backend) — sin cambios

**Primary Dependencies**: `mdwysiwyg` `^0.8.0` (antes `^0.3.0` declarado / 0.3.1 local). Sin dependencias nuevas: 0.8.0 tiene las mismas dependencias que 0.3.1

**Storage**: `settings.json` (Rust `Preferences`): dos campos nuevos con `serde(default)` (compatibles con archivos viejos)

**Testing**: Vitest (estilos, preferencias, adaptador), `cargo test` (saneado de preferencias), Playwright UI (menú → props del editor, estilos), pruebas nativas CDP existentes sin cambios de expectativa + una nueva (barra/historial), mediciones `scripts/perf`

**Target Platform**: Windows 10/11 (WebView2)

**Project Type**: desktop-app (Tauri 2)

**Performance Goals**: memoria privada del árbol < 250 MB con un documento; apertura de 100 KB ≤ +20 % respecto de `docs/performance.md`

**Constraints**: offline; ninguna expectativa de prueba existente cambia (FR-002); comparación, `autoHideBar` y `autoHeight` quedan apagados (FR-009); `allowContentZoom` apagado (lo conduce la spec 007)

**Scale/Scope**: 1 dependencia, 7 estilos × 20 variables, 2 preferencias, 2 elementos de menú, documentación

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Notas |
|---|---|---|
| I. Lightweight First | PASS (medir) | Sin dependencias nuevas; el bundle del editor crece (~+60 % JS): se mide memoria/apertura antes de cerrar (US5, R8) |
| II. Native Desktop Architecture | PASS | Preferencias por IPC/Rust como hoy; menús nativos |
| III. Markdown First | PASS | Se valida con las pruebas de fidelidad existentes que el Markdown producido no cambia (US2) |
| IV. Data Integrity | PASS | Historial: confirmar = edición normal (marcador, recuperación); alternar barra no toca contenido |
| V. Security by Design | PASS | Campos nuevos validados en Rust (`sanitized`) y en zod |
| VI. Modular Architecture | PASS | El editor sigue renderizándose solo en `EditorAdapter` (y el visor de exportación); estilos con fuente única `editorStyles.ts` ↔ `menu.rs` |
| VII. Testing and Quality | PASS | Suites existentes sin cambios de expectativa + pruebas nuevas; build de producción validado (instalador) |
| VIII. Offline First | PASS | Paquete instalado desde npm en build; en ejecución todo local |
| IX. Simplicity | PASS | Se usan las capacidades del editor (barra, historial) en vez de reimplementarlas |

**Post-diseño**: sin cambios; PASS.

## Project Structure

### Documentation (this feature)

```text
specs/003-upgrade-mdwysiwyg/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── preferences-and-menu.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
package.json / package-lock.json             # mdwysiwyg ^0.8.0
src/features/editor/EditorAdapter.tsx        # props tipadas: resolveImageSrc, showToolbar, historyUndo
src/features/editor/reloadUndo.ts            # revisar: setMarkdown deshacible (R3)
src/features/settings/editorStyles.ts        # +20 variables por estilo
src/features/settings/{store,appearance}.ts  # editorToolbarVisible, editorHistory + acciones
src/services/contracts.ts                    # zod Preferences + MenuAction nuevos
src/app/menuBridge.ts                        # view.toggleToolbar, settings.toggleHistory
src-tauri/src/services/app_data.rs           # Preferences + sanitized + tests
src-tauri/src/services/menu.rs               # CheckMenuItem "Mostrar barra de herramientas" / "Historial de versiones"
src-tauri/src/commands/app.rs                # set_view_menu (estado de los checks)
tests/unit/{editor-styles,shortcuts-appearance}.spec.ts
tests/e2e/ui/editor-options.spec.ts          # nuevo
tests/e2e/native/editor-options.cdp.mjs      # nuevo
docs/{dependencies,mdwysiwyg-limitations,upstream-requests,performance}.md, README.md
```

**Structure Decision**: misma estructura de la feature 001; cambios acotados al adaptador del editor, ajustes, menú y estilos.

## Complexity Tracking

Sin violaciones de la constitución.
