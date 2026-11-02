# Spikes

## S1 — RAM / arranque con `mdwysiwyg` (2026-11-01)

Equipo de desarrollo (Windows 11), build **debug** de Tauri 2 con el frontend embebido; `scripts/perf/measure.ps1`
(árbol de procesos: app + WebView2, 8 s en reposo, 2 corridas). El número de editores se fija con
`VITE_SPIKE_EDITORS` (`src/app/SpikeEditors.tsx`), cada uno con ~20× `gfm-lf.md`.

| Editores montados | Working set total | Private bytes total | CPU reposo | Ventana visible |
|---|---|---|---|---|
| 0 (solo shell) | 365–385 MB | 162–173 MB | 0.3–2.5 % | 0.23–0.79 s |
| 5 | 470–488 MB | 263 MB | 0–1.2 % | 0.23–0.73 s |

Hallazgos:

- Costo marginal de un editor montado: **≈ 20 MB** (privado y working set). Pool por defecto = **3** (≈ +60 MB); configurable 1–8.
- El **piso del shell vacío ya supera 100 MB**: ~8 procesos (app + WebView2: browser, GPU, renderer, utility…) suman ~165 MB privados y ~370 MB de working set (este último cuenta páginas compartidas varias veces). El objetivo SC-002 "< 100 MB" **no es alcanzable tal como está redactado** con WebView2, independientemente del editor.
- Arranque: la ventana aparece en < 1 s (cumple SC-001 de < 2 s, a confirmar con release y disco frío).
- CPU en reposo ≈ 0 una vez estabilizado.

Decisión: seguir con Tauri/WebView2 (obligatorio). **Resuelto 2026-11-01**: SC-002 redefinido a < 250 MB privados para todo el árbol de procesos con un documento abierto (antes: redefinir SC-002 (p. ej. medir solo el proceso de la app + renderer de la ventana, o fijar un objetivo realista como < 250 MB privados totales con 1 documento). Hasta entonces la medición se documenta, no se usa como puerta.)

## S2 — Fidelidad del Markdown (2026-11-02) ✔

`tests/e2e/ui/fidelity.spec.ts` (editor real en Chromium, corpus de `tests/fixtures/markdown/`):

- **Sin editar** (abrir, alternar vistas, guardar): el contenido que la app escribe es idéntico al original (gfm, no canónico, mermaid).
- **Tras editar en WYSIWYG** el documento completo se reserializa en forma canónica, incluso lo que no se tocó:
  `*   item` → `- item`, `__fuerte__` → `**fuerte**`, `_enfasis_` → `*enfasis*`. El contenido semántico se conserva (listas, énfasis, tablas, código, tareas, mermaid).
- Mitigación vigente: documentado en `docs/mdwysiwyg-limitations.md`; la vista Markdown permite editar sin normalizar; EOL y BOM los reaplica Rust.

## S3 — single-instance y asociaciones (2026-11-01) ◐

- ✔ Verificado en la app real (`tests/e2e/native/os-integration.cdp.mjs`): el archivo por argumento se abre; una segunda ejecución reenvía sus archivos a la ventana existente y termina; los no-Markdown se rechazan con aviso.
- ◐ `fileAssociations` (`.md`, `.markdown`) está en `tauri.conf.json` y el instalador NSIS se construye (4.98 MiB). **No instalado**: el registro real de las asociaciones en Windows queda por validar en una máquina limpia (T116).

## S4 — Menú Edición (2026-11-02) ◐

Decisión: menú nativo con ítems propios y **sin aceleradores** (todos los atajos los gestiona `src/features/shortcuts/manager.ts`); las acciones de Edición se dirigen al editor activo (`editCommands.ts`: teclas sintéticas para deshacer/rehacer en ProseMirror, `execCommand` para cortar/copiar/seleccionar, portapapeles asíncrono para pegar). Los atajos de teclado reales (Ctrl+N/Tab/Shift+Tab/W) se verificaron en la ventana real. Los clics en el menú nativo no se automatizaron; pegar desde el menú puede requerir permiso de portapapeles (con aviso de usar Ctrl+V si falla).

## S6 — Reordenar pestañas (2026-11-02) ✔

Pointer Events propios (`usePointerReorder.ts`); `tests/e2e/ui/tabs.spec.ts` arrastra con el ratón y comprueba el orden. No se probó el DnD HTML5 nativo de WebView2 (innecesario).

## S5 — Automatización del WebView2 real (2026-11-01) ✔

Lanzar el exe con `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333` expone CDP en `http://127.0.0.1:9333`.
Un script Node (WebSocket nativo) recargó la página, recogió consola/log y sondeó el DOM: `mdwysiwyg` monta (`.ProseMirror` presente)
bajo la CSP estricta de `tauri.conf.json` **sin violaciones de CSP**. Playwright `connectOverCDP` usa el mismo mecanismo → capa E2E nativa viable.

Hallazgo upstream: Tiptap avisa `Duplicate extension names found: ['link']` (la librería registra `link` dos veces); anotar en `docs/upstream-requests.md`.
