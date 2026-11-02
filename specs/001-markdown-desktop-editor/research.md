# Research: Markdown Desktop Editor

**Fecha**: 2026-11-01 | **Spec**: [spec.md](spec.md)

Convención: **Verificado** = leído en documentación/código fuente; **A validar** = no confirmado, queda como tarea de spike (ver plan.md, Fase A).

## R1. API real de `mdwysiwyg` (v0.2.1) — Verificado

Fuente: README y `src/components/MarkdownEditor/{README.md,types.ts}` del repo ferkiernan/mdwysiwyg.

| Aspecto | Realidad |
|---|---|
| Props | `initialContent`, `onChange(markdown)`, `width`, `height`, `sanitizeEmbeddedHtml`, `className`, `onlyView`, `resizable`, `onlyViewNotice`, `documentId`, `fileName` |
| Control | **No controlado**: `initialContent` solo se lee al montar |
| Ref (`MarkdownEditorHandle`) | solo `reset()` e `isModified()` (comparan contra el contenido del montaje) |
| Cursor/selección/scroll/undo | **Sin API pública** |
| Insertar contenido / `setContent` | **Sin API pública** |
| Imágenes | Solo por URL, desde su propio diálogo; sin hook de selección de archivo ni de resolución de `src` |
| Normalización | Al editar en WYSIWYG el Markdown se reserializa en forma canónica; alternar vistas sin editar es byte-exacto |
| Mermaid | Carga perezosa, `securityLevel: strict` |
| Tema | CSS Custom Properties `--mdw-*` (sirve para tema claro/oscuro) |
| Peer deps | `react`, `react-dom` ≥ 18 (desarrollado con 18.3.1) |
| Dependencias propias | Tiptap 3 (ProseMirror), unified/remark/rehype, lowlight, mermaid (lazy) |

### Consecuencias para el spec

| Requisito | Estado | Solución en este plan |
|---|---|---|
| FR-006 (cursor, selección, scroll, undo por pestaña) | No soportado por API | Pool acotado de editores montados (R2) |
| FR-014a (Ctrl+Z tras recargar) | No soportado por API | Upstream **U1** + fallback de instantánea (R3) |
| FR-025 (insertar imagen local, ruta relativa) | No soportado | Upstream **U2** + **U3** (R9) |
| Constitución III (sin pérdida por transformación) | Riesgo: reserializado canónico | Spike S2 con corpus; detectar y documentar diferencias (R8) |

### Cambios solicitados upstream (el autor de `mdwysiwyg` es el mismo dueño de este repo)

- **U1** `handle.setMarkdown(md)`: reemplaza contenido como transacción deshacible (Ctrl+Z restaura); no cambia la base de `isModified()`.
- **U2** `handle.insertMarkdown(md)` (inserta en el cursor) o prop `onRequestImage`.
- **U3** prop `resolveImageSrc(src) => string` para mostrar imágenes de rutas relativas.
- **U4** (opcional) `handle.getViewState()/setViewState()` (cursor, selección, scroll) para evitar el pool.

Hasta que existan, el producto funciona con los fallbacks indicados; U1–U3 se versionan como dependencia (`mdwysiwyg` ≥ 0.3).

## R2. Estrategia multi-documento con editor no controlado

- **Decisión**: pool acotado (LRU, tamaño inicial 3, configurable) de instancias montadas, una por documento; solo la activa es visible (`display:none` en las demás); las expulsadas se desmontan y se remontan con `initialContent = doc.content` al reactivarse.
- **Justificación**: conserva cursor/scroll/undo en las pestañas recientes (FR-006) y acota RAM (FR-009, Principio I). Documentos fuera del pool conservan contenido; pierden solo historial de undo/cursor, limitación documentada.
- **Alternativas**: (a) una sola instancia con `key` por documento: mínima RAM pero pierde todo estado en cada cambio; (b) todas montadas: mejor estado, RAM sin tope; (c) U4 en mdwysiwyg: ideal a futuro, hoy no existe.
- **A validar (S1)**: costo de RAM por editor montado y tiempo de remontaje para fijar el tamaño del pool.

## R3. Ctrl+Z tras recargar (FR-014a)

- **Decisión**: preferir U1 (`setMarkdown` deshacible). Fallback sin U1: guardar `preReloadSnapshot` en el documento; tras una recarga, el primer Ctrl+Z (si no hubo ediciones posteriores) restaura la instantánea y se muestra aviso "Recarga deshecha".
- **Justificación**: cumple el requisito sin inventar API; el fallback es acotado y testeable.
- **Alternativa descartada**: remontar sin ofrecer deshacer (viola FR-014a).

## R4. Runtime y plugins de Tauri 2

- **Decisión**: Tauri 2 estable. Plugins: `single-instance` (FR-024), `window-state` (FR-020) y `dialog` usado **solo desde Rust**. No usar `tauri-plugin-fs` desde el frontend.
- **Justificación**: Principio V (el frontend no accede al filesystem; servicios Rust propios con lista de rutas autorizadas) e I (menos plugins/permisos). `single-instance` debe registrarse primero y por defecto no hace nada en la segunda ejecución: hay que enfocar la ventana y reenviar argumentos (Verificado en docs).
- **Alternativas**: `plugin-fs` con scopes (superficie mayor, sin escritura atómica documentada); `window-state` propio (se evalúa en spike, el plugin es pequeño).
- **A validar (S3)**: cómo `single-instance` entrega `args` en Windows cuando el Explorador lanza el archivo asociado.

## R5. Filesystem en Rust: lectura, escritura segura y detección de cambios

- **Escritura segura**: escribir a `.<nombre>.tmp` en el mismo directorio, `sync_all`, y reemplazar con `std::fs::rename` (en Windows reemplaza el destino existente); si falla, el original queda intacto (FR-013, SC-006). Los docs de `plugin-fs` no mencionan escritura atómica (Verificado), por eso se implementa en Rust.
- **Huella de archivo** (`mtime`, `size`, hash `xxh3` del contenido leído): detecta cambio externo antes de guardar y tras eventos. `xxhash-rust` es una dependencia mínima y estable entre versiones (el hash de `std` no lo es).
- **Observación de cambios**: `notify` + `notify-debouncer-mini` (eventos nativos del SO, sin polling; FR-028). Se observa solo los archivos abiertos. Como red de seguridad barata se re-verifica la huella al recuperar el foco de la ventana y justo antes de guardar.
- **Alternativa descartada**: `watch` de `plugin-fs` (obliga a exponer fs al frontend).

## R6. Codificación y finales de línea (FR-002b, FR-013)

- **Decisión**: `encoding_rs` + `chardetng` (Mozilla, pequeños, sin runtime). Flujo: BOM → UTF-8 estricto → detección. Se registran `encoding`, `bom` y `eol` (CRLF/LF/mixto-dominante). El frontend recibe contenido con LF y Rust reaplica EOL/BOM originales al escribir. Convertir a UTF-8 requiere confirmación (el comando devuelve `ENCODING_CONVERSION_REQUIRED` hasta que el frontend reenvíe `convertToUtf8: true`).
- **Si la detección no es fiable** (`chardetng` no expone puntuación de confianza: se exige que la codificación adivinada decodifique el archivo completo sin reemplazos; si no, bytes inválidos): rechazo con mensaje, archivo intacto.
- **A definir en implementación**: lista de codificaciones aceptadas (propuesta: Windows-1252/ISO-8859-1, UTF-16 LE/BE con BOM, y las que `chardetng` devuelva con confianza alta).

## R7. Menús, atajos y Edit

- **Decisión provisional**: menú nativo de Tauri con ítems propios (Archivo, Edición, Ver) que emiten `menu://action`; aceleradores nativos solo para acciones de aplicación (Nuevo, Abrir, Guardar, Guardar como, Cerrar, Ctrl+Tab); Ctrl+Z/Y/X/C/V/A **sin acelerador de menú** para que los maneje el WebView/editor (evita conflictos, FR-018).
- **No verificado**: la doc de `muda` no indica soporte de `PredefinedMenuItem` (undo/redo/cut/copy/paste/select_all) en Windows. Los ítems de Edición se implementan como comandos al editor activo (`document.execCommand` para cortar/copiar/pegar/seleccionar; Deshacer/Rehacer vía teclado sintético o API del editor) — **A validar (S4)**.
- **Alternativa**: barra de menú HTML en React (más control, más código/DOM, requiere ventana sin decoraciones o doble barra). Se adopta solo si S4 falla.

## R8. Fidelidad del Markdown (Constitución III)

- Riesgo: el reserializado canónico de mdwysiwyg altera estilo (`*` → `-`, etc.) al editar en WYSIWYG; contenido semántico se preserva.
- **Decisión**: (a) abrir y alternar vistas no modifica nada (garantizado por la librería); (b) spike S2 con corpus de archivos Markdown reales para listar transformaciones; (c) documentar en README y mostrar la vista Markdown como alternativa sin normalización; (d) si aparece pérdida semántica, abrir issue upstream antes de ofrecer edición WYSIWYG sobre ese constructo.

## R9. Imágenes locales (US7, P3)

- Límites de mdwysiwyg: URL manual, sin hook de archivo, sin resolver `src` relativo.
- **Decisión**: acción de menú propia "Insertar imagen…": diálogo nativo (Rust) → copia opcional a `assets/` junto al documento (sin sobrescribir sin confirmación) → calcula ruta relativa → inserta con U2. Visualización: protocolo `asset:` de Tauri limitado al directorio del documento y resuelto con U3.
- **Fallback sin U2/U3**: la historia 7 queda diferida (es P3); no se usan hacks sobre el DOM del editor.

## R10. Persistencia

- **Decisión**: archivos JSON en el directorio de datos de la app, escritos por Rust con escritura atómica: `settings.json`, `session.json`, `recovery/<docId>.md` + `recovery/<docId>.json` (huella del disco al momento de editar). Sin base de datos (Principio IX).
- **Recuperación** (FR-020a): escritura con debounce de ~4 s tras el último cambio y al cambiar de pestaña; sin temporizadores cuando no hay cambios.
- **Datos corruptos**: se renombran a `*.corrupt-<ts>` y se arranca con sesión limpia.

## R11. Pruebas

- **Frontend**: Vitest + React Testing Library; IPC simulado con `@tauri-apps/api/mocks`.
- **Rust**: `cargo test` (servicios fs, escritura atómica, codificación, huella, autorización de rutas).
- **E2E (Playwright)**: capa 1 contra el servidor de Vite con IPC simulado (flujos de UI); capa 2 contra el binario real conectando por CDP al WebView2 (`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=…`) para flujos nativos. **A validar (S5)**; alternativa: `tauri-driver` (WebDriver) solo para la capa 2.

## R12. Reordenar pestañas con drag and drop

- **Decisión**: implementación propia con Pointer Events (sin dependencia).
- **Motivo**: en Windows, el manejo nativo de arrastre de archivos del WebView (que usamos para abrir archivos soltados) puede deshabilitar el DnD HTML5 interno. **A validar (S6)**; si el DnD HTML5 funciona se puede simplificar.

## R13. Empaquetado y distribución

- **Decisión**: instalador **NSIS** (`-setup.exe`, instalación por usuario, sin WiX); WebView2 en modo `embedBootstrapper` (Windows 11 y Windows 10 actualizado ya lo incluyen). Asociaciones `.md` y `.markdown` en `bundle` (`fileAssociations`).
- **Justificación**: tamaño mínimo y sin runtimes adicionales (SC-010). MSI queda como opción futura para despliegue corporativo; `offlineInstaller` (~127 MB) solo si se exige instalación sin red en equipos sin WebView2.
- **A validar (S3)**: configuración exacta de `fileAssociations` (no cubierta en las páginas consultadas) y registro correcto por el instalador.

## R14. Entorno de desarrollo (hallazgos de esta máquina)

- Node 24.18 y npm 11.16 presentes; **faltan `rustc`/`cargo`**; `link.exe` hallado es el de Git, no el de MSVC → falta **Visual Studio Build Tools (C++)** y Rust (`rustup`). WebView2 no pudo comprobarse (consulta de registro fallida; Windows 11 suele incluirlo).
- Acción: ver prerrequisitos en [quickstart.md](quickstart.md).

## R15. Rendimiento

- Presupuestos de SC-001…SC-003 se miden con un script (`scripts/perf/`) en un equipo de referencia: arranque en frío (proceso → primer render interactivo), RSS del proceso y WebView2 en reposo, cambio de pestaña, apertura de documento.
- Carga diferida: el chunk del editor (Tiptap/unified) se importa con `React.lazy` para pintar el shell primero; Mermaid ya es perezoso en la librería.
- **Riesgo declarado**: `mdwysiwyg` arrastra Tiptap + unified + lowlight; el objetivo de <100 MB RAM no está garantizado → spike S1 decide antes de construir el resto (puerta de calidad, Principio I).

## Unknowns resueltos / pendientes

| ID | Tema | Estado |
|---|---|---|
| R1 | API mdwysiwyg | Resuelto |
| R2–R3 | Estado por pestaña / Ctrl+Z | Resuelto con decisión + dependencia upstream |
| S1 | RAM/arranque con editor | Pendiente (spike) |
| S2 | Fidelidad Markdown | Pendiente (spike) |
| S3 | single-instance + fileAssociations en Windows | Pendiente (spike) |
| S4 | Menú nativo vs Edit | Pendiente (spike) |
| S5 | E2E sobre WebView2 | Pendiente (spike) |
| S6 | DnD de pestañas | Pendiente (spike) |
