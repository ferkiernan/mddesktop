# Implementation Plan: Markdown Desktop Editor

**Branch**: `001-markdown-desktop-editor` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-markdown-desktop-editor/spec.md`

## Summary

Editor Markdown de escritorio, local y liviano: shell Tauri 2 (Rust) + UI React/TypeScript/Vite, con `mdwysiwyg` como único motor de edición. Rust concentra todo acceso a disco (lectura con detección de codificación/EOL, escritura atómica, huellas para detectar cambios externos, observación por eventos del SO, sesión/recuperación en JSON) y la autorización de rutas; el frontend solo orquesta documentos, pestañas y atajos mediante una capa de servicios tipada.

Hallazgo central de la investigación ([research.md](research.md) R1): `mdwysiwyg` 0.2.1 es **no controlado** y no expone cursor/scroll/undo, `setContent` ni hooks de imágenes. El plan lo resuelve con un **pool LRU de editores montados** y un **adaptador** que usa tres mejoras upstream (U1–U3, mismo autor) cuando existan, con fallback acotado cuando no. Un **spike inicial** (Fase A) valida RAM/arranque y los supuestos de plataforma antes de construir el resto.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict) + React 18.3 (versión con la que se desarrolló `mdwysiwyg`); Rust estable (edición 2021+), última versión estable de Tauri 2 al crear el proyecto

**Primary Dependencies**:
- Frontend: `react`, `react-dom`, `mdwysiwyg` (≥0.2.1; ≥0.3 para U1–U3), `zustand`, `zod`, `@tauri-apps/api`
- Rust: `tauri` 2, `tauri-plugin-dialog` (solo uso desde Rust), `tauri-plugin-single-instance`, `tauri-plugin-window-state`, `serde`/`serde_json`, `notify` + `notify-debouncer-mini`, `encoding_rs`, `chardetng`, `xxhash-rust`, `thiserror`
- Cada dependencia está justificada en [research.md](research.md); no se agregan librerías de DnD, rutas, UI kits ni estado extra

**Storage**: archivos JSON/Markdown en el directorio de datos de la app (`settings.json`, `session.json`, `recovery/`); sin base de datos. Ver [contracts/storage-formats.md](contracts/storage-formats.md)

**Testing**: Vitest + React Testing Library (frontend, IPC simulado con `@tauri-apps/api/mocks`); `cargo test` (servicios Rust); Playwright E2E en dos capas (UI con IPC simulado; binario real vía CDP a WebView2 — validar en S5)

**Target Platform**: Windows 10/11 x64 (WebView2) primero; arquitectura sin dependencias específicas de Windows fuera de `src-tauri/src/platform/` para macOS/Linux posteriores

**Project Type**: desktop-app (Tauri: frontend web + backend Rust en un mismo repositorio)

**Performance Goals**: arranque en frío < 2 s; RAM en reposo < 250 MB privados para todo el árbol de procesos con un documento abierto; CPU en reposo ≈ 0; cambio de pestaña < 100 ms; apertura de documento habitual < 500 ms (SC-001…SC-003), medidos con `scripts/perf/` en un equipo de referencia

**Constraints**: offline total; sin Electron/Node/Chromium en producción; sin servidor HTTP; sin polling ni procesos residentes; acceso a disco solo vía comandos Rust con rutas autorizadas; permisos mínimos de Tauri; instalador sin requisitos extra para el usuario final

**Scale/Scope**: uso individual; documentos de notas/documentación (la librería no virtualiza documentos masivos); ~10 documentos abiertos simultáneos como caso de diseño; umbral de aviso por tamaño inicial 5 MB (FR-002a)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación inicial | Evaluación tras el diseño |
|---|---|---|
| I. Lightweight First | **Riesgo**: `mdwysiwyg` arrastra Tiptap + unified + lowlight; presupuesto de RAM no garantizado | PASS condicionado: S1 mide antes de construir; editor en chunk perezoso; pool acotado; sin plugins ni deps extra; medición obligatoria (R15) |
| II. Native Desktop Architecture | Alineado | PASS: Tauri 2 + Rust + React/TS + Vite; IPC por Tauri Commands; sin HTTP local ni Node en producción |
| III. Markdown First | **Riesgo**: reserializado canónico al editar en WYSIWYG | PASS condicionado: abrir/alternar es byte-exacto; S2 documenta transformaciones con corpus real; EOL/BOM/UTF-8 preservados en Rust |
| IV. Data Integrity | Alineado | PASS: escritura atómica, huellas, conflicto con 3 opciones, recuperación ~4 s, confirmación al cerrar/salir, sin escrituras si no hay cambios |
| V. Security by Design | Alineado | PASS: sin `plugin-fs` en el frontend; `AuthorizedPaths` solo desde orígenes confiables de Rust; validación Zod+Rust; sin ejecución de comandos; capacidades mínimas |
| VI. Modular Architecture | Alineado | PASS: módulos separados; componentes sin acceso a FS; contratos tipados ([contracts/](contracts/)); decisiones registradas aquí y en research.md |
| VII. Testing and Quality | Alineado | PASS: unit, integración Rust, E2E; build de producción validado en CI y en quickstart |
| VIII. Offline First | Alineado | PASS: sin red ni telemetría; WebView2 `embedBootstrapper` (el runtime ya viene en Windows 10/11 actualizados) |
| IX. Simplicity and Scope Control | Alineado | PASS: JSON en lugar de BD; DnD propio sin librería; U1–U3 en la librería en vez de hacks; imágenes (P3) diferibles sin impacto en el MVP |

Violaciones sin justificar: ninguna. No hay entradas en Complexity Tracking.

## Decisiones de diseño clave

| ID | Decisión | Detalle |
|---|---|---|
| D1 | Rust es dueño del disco | Todo I/O y autorización de rutas en `src-tauri`; el frontend recibe/entrega contenido y huellas ([contracts/ipc-commands.md](contracts/ipc-commands.md)) |
| D2 | Pool LRU de editores | Un `mdwysiwyg` montado por documento reciente (tamaño 3, configurable), ocultos con `display:none`; expulsados se remontan desde `doc.content` ([research.md](research.md) R2) |
| D3 | Contenido en el frontend con `\n` | Rust normaliza al leer y reaplica EOL/BOM al escribir |
| D4 | Conflicto externo = 3 opciones | Pisar / Abrir versión del disco en pestaña nueva / Recargar aquí; Ctrl+Z vía U1 o `reloadSnapshot` (FR-014/14a) |
| D5 | Autorización de rutas en Rust | Diálogo, argv, segunda instancia, arrastre del SO y `session.json` propio; nunca por el frontend |
| D6 | Eventos del SO, sin polling | `notify` para cambios; re-chequeo al recuperar foco y antes de guardar |
| D7 | Menú nativo de Tauri | Aceleradores solo para acciones de app; Ctrl+Z/Y/X/C/V/A los maneja el WebView (S4 valida; alternativa: menú HTML) |
| D8 | Adaptador único del editor | [contracts/editor-adapter.md](contracts/editor-adapter.md); activa U1/U2/U3 por detección de capacidades |
| D9 | Instalador NSIS | Por usuario, asociaciones `.md`/`.markdown`; MSI diferido |

## Project Structure

### Documentation (this feature)

```text
specs/001-markdown-desktop-editor/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── ipc-commands.md
│   ├── ipc-events.md
│   ├── editor-adapter.md
│   └── storage-formats.md
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks — no lo crea /speckit-plan)
```

### Source Code (repository root)

```text
src/                                   # Frontend (React + TS + Vite)
├── app/                               # Application Shell: App.tsx, layout, providers, errores globales
├── features/
│   ├── documents/                     # Document Manager: store Zustand, acciones (new/open/save/close), conflictos
│   ├── tabs/                          # Tab Manager: barra, reordenado por pointer events, menú contextual
│   ├── editor/                        # Editor Adapter + pool LRU + carga perezosa de mdwysiwyg
│   ├── session/                       # Session Manager: restauración y recuperación
│   ├── settings/                      # Settings Manager: tema, zoom, barra de estado
│   ├── shortcuts/                     # Keyboard Shortcut Manager
│   └── images/                        # Inserción de imágenes locales (P3)
├── services/                          # Única capa que llama a Tauri: ipc.ts, contracts.ts (Zod), events.ts, errors.ts
├── ui/                                # Componentes presentacionales: StatusBar, Dialogs, Toasts, ConflictDialog
└── main.tsx

src-tauri/                             # Backend nativo (Rust)
├── Cargo.toml
├── tauri.conf.json                    # bundle NSIS, fileAssociations, CSP estricta, ventana
├── capabilities/default.json          # permisos mínimos
├── icons/
└── src/
    ├── main.rs / lib.rs               # builder, plugins (single-instance primero), setup
    ├── commands/                      # documents.rs, session.rs, settings.rs, images.rs, app.rs
    ├── services/
    │   ├── fs_service.rs              # lectura, escritura atómica, huellas
    │   ├── encoding.rs                # BOM, detección, EOL
    │   ├── authz.rs                   # AuthorizedPaths
    │   ├── dialog_service.rs
    │   ├── watcher.rs                 # notify + debounce
    │   ├── persistence.rs             # settings/session/recovery
    │   ├── lifecycle.rs               # single-instance, argv, drop, cierre
    │   └── menu.rs
    ├── platform/                      # específico de SO (asociaciones, rutas)
    ├── error.rs                       # AppError
    └── state.rs

tests/
├── unit/                              # Vitest (stores, servicios, adaptador)
├── components/                        # React Testing Library
├── e2e/                               # Playwright (capa UI y capa nativa)
└── fixtures/                          # corpus Markdown, fixtures IPC compartidos con Rust
src-tauri/tests/                       # Integración Rust (fs, encoding, authz, persistence)
scripts/perf/                          # Mediciones de arranque/RAM/cambio de pestaña
docs/                                  # Resultados de rendimiento, limitaciones de mdwysiwyg, ADRs
```

**Structure Decision**: proyecto Tauri estándar de dos paquetes en un único repositorio (frontend en `src/`, backend en `src-tauri/`), con la capa `src/services/` como frontera obligatoria y `src-tauri/src/services/` como dueño del sistema operativo. Cumple VI (modularidad) y V (frontera de seguridad).

## Fases de implementación

Alineadas con las 15 etapas de la descripción original. Cada fase tiene criterios de aceptación y pruebas (se detallarán como tareas en `/speckit-tasks`).

| Fase | Etapas del spec | Contenido | Puerta de salida |
|---|---|---|---|
| **A. Spikes** | 1, 2 | Scaffold Tauri+React+Vite; montar `mdwysiwyg`; S1 (RAM/arranque/remontaje), S2 (fidelidad Markdown), S3 (single-instance + `fileAssociations`), S4 (menú vs Edit), S5 (E2E sobre WebView2), S6 (DnD de pestañas) | Informe en `docs/spikes.md`; si S1 incumple el presupuesto → decidir (ajustar pool, U4, o replantear) antes de seguir |
| **B. Núcleo de documento** | 3, 5, 7, 8, 9 | Adaptador+pool, Document Manager, servicios Rust (authz, lectura, escritura atómica, huellas, codificación), nuevo/abrir/guardar/guardar como | US1 completa |
| **C. Shell y pestañas** | 4, 6, 11 | Menú, barra de pestañas (reordenar, cerrar otras/todas), barra de estado, atajos, tema/zoom | US2, US6 |
| **D. Integridad** | 10 | Cierre con pendientes (pestaña/todas/salir), watcher, conflicto de 3 opciones, FR-014a | US3 |
| **E. Persistencia y SO** | 12, 13 | Sesión, recuperación (~4 s), preferencias, single-instance, argv, arrastre, asociaciones | US4, US5 |
| **F. Imágenes** | 14 | Requiere mdwysiwyg con U2/U3; si no está listo se difiere sin bloquear el release | US7 |
| **G. Calidad y release** | 15 | E2E completos, mediciones documentadas, build NSIS, prueba en equipo limpio | SC-001…SC-010 |

Dependencia externa: publicar `mdwysiwyg` 0.3 con U1–U3 en paralelo a las fases A–E (repositorio propio, spec-first como el resto de ese proyecto).

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| RAM/arranque por el peso de Tiptap/unified | SC-001/002 | S1 temprano; chunk perezoso; pool acotado; U4 |
| Reserializado de Markdown | Principio III | S2; vista Markdown disponible; issue upstream |
| `single-instance`/`fileAssociations` en Windows no verificados | US5 | S3 antes de la Fase E |
| Menú nativo y Edición | FR-017/018 | S4; alternativa de menú HTML |
| Falta de `rustc`/MSVC en el equipo | Bloquea Fase A | Prerrequisitos en [quickstart.md](quickstart.md) |
| E2E sobre WebView2 | Principio VII | S5; alternativa `tauri-driver` |

## Complexity Tracking

Sin violaciones de la constitución que justificar.
