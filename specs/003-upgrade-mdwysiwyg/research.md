# Research: Actualizar el editor a su última versión

Hechos verificados el 2026-11-14 sobre los tarballs publicados (0.6.0, 0.7.0, 0.8.0) y el repositorio del editor.

## R1 — Versión y fijación

- **Decision**: `"mdwysiwyg": "^0.8.0"` en `package.json`, instalada con `npm install` normal (sin `--no-save` ni tarball local); `package-lock.json` fija la 0.8.0 exacta.
- **Rationale**: FR-001/SC-001: build reproducible. 0.3.1 nunca se publicó (npm salta de 0.3.0 a 0.4.0), así que hoy una instalación limpia trae 0.3.0 sin estilos.
- **Alternatives**: fijar `0.8.0` exacto (descartado: el lock ya fija; `^` permite parches de errores).

## R2 — Tematizado con el mecanismo nuevo

- **Decision**: mantener `html[data-editor-style="id"] .mdd-editor { --mdw-*: … }`. Desde 0.5.0 el editor **lee** las variables (no las declara) y acepta cualquier ancestro; la clase del control tiene prioridad, que es la que ya usamos. Los menús/paneles flotantes (montados en `body`) copian los valores al abrirse, así que también se tematizan.
- **Rationale**: ningún cambio de mecanismo; solo completar valores.
- **Alternatives**: declarar en `:root` (descartado: afectaría al visor de exportación y a la vista previa de 004 sin control por estilo).

## R3 — API de host tipada y deshacer tras recargar

- **Decision**: pasar `resolveImageSrc` como prop tipada (hoy va como objeto sin tipo) y usar `insertMarkdown`/`setMarkdown` del handle tipado. `reloadUndo.ts` (alternativa de FR-014a de la 001) se sustituye por `setMarkdown`, que es deshacible desde 0.3.0, **si** la prueba nativa de recuperación/recarga sigue pasando sin cambiar expectativas; si no, se conserva.
- **Rationale**: elimina código de compatibilidad con 0.2.x (principio IX) sin riesgo: lo decide la prueba.

## R4 — "Mostrar barra de herramientas"

- **Decision**: prop `showToolbar` (0.4.0) en todos los editores montados (pool de 3) desde la preferencia `editorToolbarVisible` (default `true`). Menú Ver → `CheckMenuItem` `view.toggleToolbar`. El estado del check lo sincroniza un comando `set_view_menu({ toolbar, history })`, igual que hoy `set_style_menu`.
- **Rationale**: el editor garantiza que alternar no remonta, no llama `onChange` y conserva cursor/undo (changelog 0.4.0) → no afecta al marcador de modificado.
- **Note**: con la barra oculta, el botón de historial no está; si el historial está abierto, el editor lo cierra sin aplicar (comportamiento del editor, US6 escenario 6).

## R5 — "Historial de versiones"

- **Decision**: prop `historyUndo` (0.4.0) desde `editorHistory` (default `true`, pedido de la persona propietaria); Configuración → `CheckMenuItem` `settings.toggleHistory`.
- **Riesgo**: "Confirmar" llama `onChange` una vez; el `userEdit` tracker solo cuenta `onChange` dentro de una ventana de interacción. El clic en Confirmar es interacción de puntero → cuenta como edición. Se cubre con prueba (confirmar ⇒ marcador de modificado; abrir/cerrar sin confirmar ⇒ sin marcador).
- **Atajos**: el gestor de atajos de la app no enlaza Ctrl+Z/Y (los deja al editor), así que Undo/Redo del historial funcionan sin conflicto.
- **Persistencia**: el historial vive en memoria por editor; se pierde al descartar un editor del pool o cerrar la pestaña (documentado en la ayuda del elemento y en README).

## R6 — Triángulo del menú de tabla (0.4.0)

- **Decision**: sin código; prueba UI: hover + clic en el triángulo y cerrar sin elegir ⇒ sin marcador de modificado; atajos globales (Ctrl+S/W/O) siguen respondiendo con el menú abierto. El visor de exportación usa `onlyView`, donde el editor no dibuja el triángulo (verificado en el changelog; se comprueba en la prueba nativa de exportación).

## R7 — Las 20 variables de 0.5.0 en los 7 estilos

- **Decision**: definir en cada estilo: `--mdw-code-keyword/-string/-comment/-number/-title`, `--mdw-blockquote-fg/-border`, `--mdw-control-border/-highlight/-shadow/-pressed-shadow`, `--mdw-separator-color`, `--mdw-popover-bg/-shadow`, `--mdw-menu-hover-bg`, `--mdw-danger-fg/-hover-fg`, `--mdw-table-picker-selected-bg`, `--mdw-link-fg/-visited-fg`. "Default" usa los valores por defecto del editor (aspecto idéntico). Los oscuros derivan de su paleta (popover = fondo de contenido; link legible). Las variables de 0.7/0.8 (`padding`, tamaños, `zoom`, `toolbar-scale`) no se fijan en estilos (las usa 007).
- **Validación**: prueba unitaria de contraste ≥ 4,5:1 para pares texto/fondo (código sobre `code-block-bg`, cita, enlaces sobre `content-bg`, popover) + la existente de Mermaid; `REQUIRED` de la prueba de estilos pasa a 39 variables.

## R8 — Rendimiento y tamaño

- **Decision**: repetir `scripts/perf/measure.ps1` y `measure-ui.mjs` (memoria con un documento, apertura de 100 KB) y registrar tamaños de exe/instalador en `docs/performance.md`. Umbrales: < 250 MB; apertura ≤ +20 %.
- **Rationale**: el JS del editor pasa de ~122 KB a ~195 KB; se mide, no se asume (principio I).

## R9 — Elementos que no se activan

- `mode="compare"` (lo usará la spec 008), `autoHideBar`, `autoHeight`, `allowContentZoom` (la spec 007 conduce el zoom con `--mdw-content-zoom`): no se pasan → valores por defecto (apagados).

## Resultados (implementación, 2026-11-14)

- **Línea base 0.8.0** (antes de adaptar nada): tsc, lint, 122 Vitest, 35 Rust y 35 Playwright en verde. Único aviso: Tiptap `Duplicate extension names found: ['link']` (U5, del editor). La prueba nativa de estilos falló solo porque buscaba la barra como primer hijo del editor; 0.8.0 renderiza otros nodos antes: ahora la busca por su clase (misma aserción).
- **R3**: se conserva el camino de recarga con remontaje + `reloadSnapshot` (cubierto por las pruebas nativas de recuperación/recarga); `setMarkdown` queda tipado y disponible para la spec 008.
- **R7 (desviación)**: además de las 20 variables de 0.5.0 hacía falta definir las 5 base (`--mdw-bg/-fg/-muted/-border/-accent`): menús, diálogos y paneles toman de ellas texto y fondo. Total por estilo: 44 variables. Winamp: el texto del contenido pasa de `#209400` (3,9:1) a `#2fc400` para cumplir 4,5:1. Default = valores por defecto del editor.
- **Hallazgos para el editor**: barra del historial en inglés (U7); sin opción de tema de Mermaid (U8). Ver `docs/upstream-requests.md`.
- **Mediciones** (R8): memoria 201–210 MB privados con un documento; apertura de 100 KB 366–380 ms; cambio de pestaña mediana 55 ms. Detalle en `docs/performance.md`.
- **Validación**: `npm ci` limpio ⇒ 0.8.0 con estilos; 127 Vitest, 36 Rust, 42 Playwright y 7 pruebas nativas en verde.
