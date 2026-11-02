# Implementation Plan: Exportar documento

**Branch**: `002-export-document` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-export-document/spec.md`

## Summary

Archivo → Exportar (HTML, PDF, Word, OpenDocument) del documento activo con el aspecto exacto del visualizador y ancho A4. El frontend monta un visor fuera de pantalla con el contenido actual y el estilo activo, toma una instantánea autocontenida (estilos computados en línea, imágenes `data:`, SVG de Mermaid) y, según el formato, la guarda como HTML o la rasteriza por páginas A4 (SVG `foreignObject` → canvas, verificado en WebView2) para empaquetarla en PDF, DOCX u ODT con escritores propios sin dependencias. Rust solo elige la ruta (diálogo nativo, autorizada) y escribe los bytes de forma atómica.

## Technical Context

**Language/Version**: TypeScript 5.9 strict + React 18.3 (frontend); Rust estable (backend), igual que la feature 001

**Primary Dependencies**: ninguna nueva en el frontend; Rust: `base64` (decodificar los bytes recibidos). Se reutilizan `mdwysiwyg`, `tauri-plugin-dialog`, `fs_service::atomic_write`

**Storage**: archivos de salida elegidos por el usuario; sin estado persistente

**Testing**: Vitest (escritores ZIP/PDF/DOCX/ODT, paginación, instantánea, flujo con IPC simulado), `cargo test` (autorización y escritura de exportaciones), pruebas nativas CDP sobre la app real, Playwright UI (menú → flujo con IPC simulado)

**Target Platform**: Windows 10/11 (WebView2); el diseño no usa APIs específicas de plataforma

**Project Type**: desktop-app (misma estructura Tauri de la feature 001)

**Performance Goals**: documento de 10 páginas A4 exportado en < 20 s sin congelar la UI (SC-002); módulo cargado bajo demanda (SC-008)

**Constraints**: offline; sin procesos externos; escritura solo sobre ruta elegida; archivos válidos en Word/LibreOffice; ancho A4 siempre

**Scale/Scope**: un documento por exportación; decenas de páginas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Notas |
|---|---|---|
| I. Lightweight First | PASS | Sin dependencias de frontend; módulo bajo demanda (`import()`); el visor oculto se destruye al terminar; una dependencia Rust diminuta (`base64`) justificada en R7 |
| II. Native Desktop Architecture | PASS | Comandos Tauri, sin servidor ni Node en producción; Rust hace el I/O |
| III. Markdown First | PASS | La exportación no altera el `.md`; el Markdown sigue siendo la fuente de verdad |
| IV. Data Integrity | PASS | Escritura atómica (temp+rename); no se tocan los documentos; la instantánea se toma al inicio |
| V. Security by Design | PASS | Ruta autorizada solo por el diálogo nativo y solo extensiones `html/pdf/docx/odt`; sin ejecución de comandos; permisos de Tauri sin cambios |
| VI. Modular Architecture | PASS | `src/features/export/` con capas separadas (instantánea, paginación, rasterizado, escritores) y acceso a disco solo vía `services/ipc.ts` |
| VII. Testing and Quality | PASS | Pruebas unitarias, de integración Rust y nativas; ver [quickstart.md](quickstart.md) |
| VIII. Offline First | PASS | Nada de red; imágenes remotas solo si ya están disponibles (degradan con aviso) |
| IX. Simplicity and Scope Control | PASS | Escritores mínimos propios en vez de librerías; PDF/DOCX/ODT de imágenes (fidelidad > edición) documentado como supuesto; mejoras futuras (PDF vectorial) fuera de alcance |

Sin violaciones: no hay entradas en Complexity Tracking. Reevaluación tras el diseño: sin cambios.

## Decisiones de diseño

| ID | Decisión | Referencia |
|---|---|---|
| E1 | Visor fuera de pantalla con el mismo componente y estilo | [research.md](research.md) R1 |
| E2 | Instantánea con estilos computados en línea e imágenes `data:` | R2 |
| E3 | Rasterizado SVG `foreignObject` → canvas, JPEG a 2× | R3 |
| E4 | Paginación en límites de bloque (A4 794×1123 px, margen 15 mm) | R4 |
| E5 | PDF/DOCX/ODT escritos a mano (ZIP sin compresión + CRC-32) | R5, R6 |
| E6 | Rust: `pick_export_path` + `write_export` con ruta autorizada | R7, [contracts/export-commands.md](contracts/export-commands.md) |
| E7 | Carga bajo demanda y progreso por páginas | R8 |

## Project Structure

### Documentation (this feature)

```text
specs/002-export-document/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── export-commands.md
│   └── export-package-formats.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
src/features/export/                 # todo el módulo se carga bajo demanda
├── exportDocument.ts                # orquestación: formato -> ruta -> render -> bytes -> escribir
├── viewer.ts                        # visor oculto (mdwysiwyg solo lectura) y espera de Mermaid/imágenes
├── snapshot.ts                      # DOM -> HTML autocontenido (estilos en línea, imágenes data:)
├── paginate.ts                      # puntos de corte A4 en límites de bloque
├── rasterize.ts                     # páginas -> JPEG (foreignObject + canvas)
├── zip.ts                           # ZIP "stored" + CRC-32
├── pdf.ts                           # escritor PDF de imágenes A4
├── docx.ts                          # escritor DOCX (imágenes ancladas A4)
├── odt.ts                           # escritor ODT (imágenes ancladas A4)
├── htmlPage.ts                      # envoltorio HTML A4 autocontenido
└── constants.ts                     # medidas A4, márgenes, escala

src-tauri/src/
├── commands/exports.rs              # pick_export_path, write_export
└── services/{authz.rs,menu.rs}      # rutas de exportación autorizadas; submenú Archivo > Exportar

tests/unit/export-*.spec.ts          # escritores, paginación, instantánea, flujo
tests/e2e/native/export.cdp.mjs      # 4 formatos sobre la app real
tests/e2e/ui/export.spec.ts          # menú -> flujo con IPC simulado
```

**Structure Decision**: módulo propio dentro de la estructura de la feature 001; solo el menú (`menu.rs`, `menuBridge.ts`) y la capa `services` se tocan fuera del módulo.

## Complexity Tracking

Sin violaciones que justificar.
