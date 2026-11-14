# Research: Estilo y paginación fiable al exportar

## R1 — Vista previa = archivo
- **Decision**: la vista previa ejecuta `buildExport` completo con el estilo elegido; las páginas JPEG se muestran como `blob:` y los bytes quedan en memoria; "Exportar" escribe esos bytes. Cambiar de estilo invalida y recalcula (contador de generación: solo vale la última).
- **Alternatives**: recalcular al exportar (descartado: riesgo de diferencias y doble costo).

## R2 — Estilo de exportación en el visor
- **Decision**: `withViewer(markdown, fn, documentId, styleVars?)`. Con `styleVars`, el editor oculto recibe la clase `mdd-export-editor` (no `mdd-editor`, que trae el estilo activo) y el contenedor recibe las variables en línea (mdwysiwyg ≥ 0.5 las lee de cualquier ancestro). El contenedor fija siempre `--mdw-content-zoom: 1` (el zoom de pantalla de la spec 007 no llega a la exportación).
- "Como en pantalla" = sin `styleVars` (comportamiento actual).

## R3 — Ajuste horizontal y de gráficos
- **Decision**: en el documento de medición (iframe aislado), antes de paginar: imágenes con `max-width:100%; height:auto`; imagen más alta que el alto útil ⇒ ancho reducido proporcionalmente; tabla más ancha que el área útil ⇒ `zoom` = ancho útil / ancho; `pre` con `white-space: pre-wrap; overflow-wrap: anywhere`. Se re-serializa el HTML ajustado. Reducción por debajo del 50 % ⇒ aviso.

## R4 — Cortes entre renglones
- **Decision**: un bloque más alto que la página con hijos de bloque se recorre (como hoy); si su contenido es en línea (párrafo, `pre`, celda), sus renglones se obtienen con `Range.getClientRects()` agrupando por línea y cada renglón es candidato de corte. Líneas sueltas: en grupos de ≥ 4 renglones, el primero y los dos últimos llevan `keepWithNext` (no se corta tras ellos), reutilizando la regla de encabezados.

## R5 — Tablas
- **Decision**: cada fila es candidata de corte; una fila más alta que la página usa R4 en sus celdas. Si una página empieza dentro de una tabla con fila de encabezado (`th`), esa página dibuja primero una copia del encabezado (tabla con los anchos de columna medidos) y el alto útil se reduce en su altura.

## R6 — Panel
- **Decision**: panel modal grande propio (no `ask()`): lista de estilos (grupo de opciones navegable con flechas), vista previa con scroll de páginas y "Página X de N", progreso y botones Cancelar / Exportar. Escape = Cancelar.
- Word/ODT: vista previa continua aproximada hasta la spec 006.

## R7 — Preferencia
- `exportStyle: string` (default `"screen"`), patrón de id; estilo inexistente ⇒ "Como en pantalla".
