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

## S2–S6

Se resuelven dentro de la fase de cada historia para no bloquear el núcleo, con estos valores por defecto:

| Spike | Se resuelve en | Valor por defecto hasta entonces |
|---|---|---|
| S2 fidelidad Markdown | US1 (T026, necesita el editor integrado) | Abrir/alternar es byte-exacto por contrato de la librería; la app solo guarda el `content` que ya tiene |
| S3 single-instance + fileAssociations | US5 | Plugin ya registrado primero en `lib.rs` |
| S4 menú Edición nativo | US6 | Menú nativo sin aceleradores para Ctrl+Z/Y/X/C/V/A; si falla, menú HTML |
| S5 E2E sobre WebView2 | Fase 10 / primera prueba nativa (US4) | Capa `ui` con IPC simulado |
| S6 DnD de pestañas | US2 | Pointer Events propios |

## S5 — Automatización del WebView2 real (2026-11-01) ✔

Lanzar el exe con `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333` expone CDP en `http://127.0.0.1:9333`.
Un script Node (WebSocket nativo) recargó la página, recogió consola/log y sondeó el DOM: `mdwysiwyg` monta (`.ProseMirror` presente)
bajo la CSP estricta de `tauri.conf.json` **sin violaciones de CSP**. Playwright `connectOverCDP` usa el mismo mecanismo → capa E2E nativa viable.

Hallazgo upstream: Tiptap avisa `Duplicate extension names found: ['link']` (la librería registra `link` dos veces); anotar en `docs/upstream-requests.md`.
